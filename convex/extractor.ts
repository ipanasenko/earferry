import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  describeFailure,
  isWaitingLiveStatus,
  nextCheckDelay,
  publishedDate,
  recoveryDelay,
  waitingDescription,
} from "./domain";

// HTTP contract of the earferry-extractor Worker (see docs/ARCHITECTURE.md,
// "Extractor Worker contract"). All endpoints take
// `authorization: Bearer {INTERNAL_SECRET}`:
//   POST /probe            { url } -> yt-dlp metadata JSON (proxied)
//   POST /extract          { itemId, url } -> 202; the Worker drives the
//                          container, streams into R2 at items/{itemId}.mp3,
//                          then calls back our /internal/* HTTP actions
//   DELETE /jobs/{itemId}  -> cancel + delete R2 objects
//   GET /health            -> container health (proxied)

export type ProbeMetadata = {
  title?: string;
  channel?: string;
  uploader?: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  live_status?: string;
  timestamp?: number;
  release_timestamp?: number;
  upload_date?: string;
};

export type ExtractorHealth = {
  ok: boolean;
  busy: boolean;
  job: unknown;
  tokenProvider: unknown;
};

type DiagnosticsResult = {
  serverTime: number;
  item: {
    id: string;
    status: string;
    phase?: string;
    error?: string;
    attempts: number;
    extractionStartedAt?: number;
    lastHeartbeatAt?: number;
    recoveryAt?: number;
  };
  extractor: ExtractorHealth | { ok: false; error: string };
};

function extractorConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.EXTRACTOR_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;
  return { baseUrl, secret: process.env.INTERNAL_SECRET ?? "" };
}

// The Worker answers errors as JSON { error }, so unwrap before the text
// lands in an item's error field.
async function extractorError(response: Response, fallback: string): Promise<string> {
  const text = (await response.text().catch(() => "")).trim();
  let message = "";
  try {
    const body = JSON.parse(text);
    if (typeof body?.error === "string") message = body.error;
  } catch {
    message = text;
  }
  return (message || fallback).slice(0, 500);
}

// A hung extractor must not hang the calling action with it: an unanswered
// fetch would strand the item in its in-flight status until the lease watchdog
// picks it up. yt-dlp probes are the slowest call and finish well under this.
const EXTRACTOR_FETCH_TIMEOUT_MS = 120_000;

async function extractorFetch(
  baseUrl: string,
  secret: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXTRACTOR_FETCH_TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function probeVideo(
  baseUrl: string,
  secret: string,
  url: string,
): Promise<ProbeMetadata> {
  const response = await extractorFetch(baseUrl, secret, "/probe", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  if (!response.ok) {
    throw new Error(await extractorError(response, "The extractor could not read this video"));
  }
  return (await response.json()) as ProbeMetadata;
}

export async function startExtraction(
  baseUrl: string,
  secret: string,
  job: { itemId: string; url: string; attemptToken: string },
): Promise<void> {
  const response = await extractorFetch(baseUrl, secret, "/extract", {
    method: "POST",
    body: JSON.stringify(job),
  });
  if (!response.ok) {
    if (response.status === 409) throw new Error("Another extraction is already running");
    throw new Error(await extractorError(response, `The extractor answered ${response.status}`));
  }
}

export async function cancelJob(baseUrl: string, secret: string, itemId: string): Promise<void> {
  const response = await extractorFetch(baseUrl, secret, `/jobs/${encodeURIComponent(itemId)}`, {
    method: "DELETE",
  });
  if (response.ok || response.status === 404) return;
  throw new Error(`Extractor cancellation failed (${response.status})`);
}

export async function health(baseUrl: string, secret: string): Promise<ExtractorHealth> {
  const response = await extractorFetch(baseUrl, secret, "/health");
  if (!response.ok) throw new Error(`Extractor health check failed (${response.status})`);
  return (await response.json()) as ExtractorHealth;
}

export const run = internalAction({
  args: { itemId: v.id("items"), startedAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    // The dispatcher (items.dispatchNext) already claimed the item by moving
    // it to "probing"; anything else means this run was superseded. startedAt
    // is the claim time and fences this run's failure reports against a
    // newer claim of the same item.
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || item.status !== "probing") return;
    if (args.startedAt !== undefined && item.extractionStartedAt !== args.startedAt) return;

    const config = extractorConfig();
    if (!config) {
      await ctx.runMutation(internal.items.markFailed, {
        itemId: args.itemId,
        detail: "Extractor not configured",
      });
      return;
    }
    const { baseUrl, secret } = config;

    try {
      const metadata = await probeVideo(baseUrl, secret, item.url);
      const duration = Number(metadata.duration);
      await ctx.runMutation(internal.items.recordProbe, {
        itemId: args.itemId,
        title: metadata.title ?? undefined,
        channel: metadata.channel ?? metadata.uploader ?? undefined,
        description: metadata.description ?? undefined,
        durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : undefined,
        publishedAt: publishedDate(metadata) ?? undefined,
        artworkUrl: metadata.thumbnail ?? undefined,
      });

      if (isWaitingLiveStatus(metadata.live_status)) {
        // Premiere or live stream: check again once YouTube has the recording.
        await ctx.runMutation(internal.items.setStatus, {
          itemId: args.itemId,
          status: "waiting",
          phase: waitingDescription(metadata),
        });
        await ctx.scheduler.runAfter(nextCheckDelay(metadata), internal.extractor.recheck, {
          itemId: args.itemId,
        });
        // Parking this item frees the slot for the next queued one.
        await ctx.scheduler.runAfter(0, internal.items.dispatchNext, {});
        return;
      }

      const attemptToken = await ctx.runMutation(internal.items.beginExtraction, {
        itemId: args.itemId,
      });
      if (!attemptToken) return;
      await startExtraction(baseUrl, secret, {
        itemId: args.itemId,
        url: item.url,
        attemptToken,
      });
    } catch (error) {
      const detail = String((error as Error)?.message ?? error).slice(0, 500);
      if (detail === "Another extraction is already running") {
        // The container is still busy (a cancelled job winding down, or a
        // self-test). Requeue and let the dispatcher retry shortly.
        await ctx.runMutation(internal.items.requeue, {
          itemId: args.itemId,
          phase: "Waiting for a free extractor",
          delayMs: 60_000,
          observedStartedAt: args.startedAt,
        });
        return;
      }
      // Transient trouble (network, extractor restart, YouTube throttling)
      // gets the same bounded auto-retry as extraction failures do.
      await ctx.runMutation(internal.items.retryOrFail, {
        itemId: args.itemId,
        detail,
        retryable: !describeFailure(detail).permanent,
        observedStartedAt: args.startedAt,
      });
    }
  },
});

export const recover = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || !["extracting", "uploading"].includes(item.status)) return;

    const observedHeartbeatAt = item.lastHeartbeatAt ?? item.extractionStartedAt;
    if (!observedHeartbeatAt) return;
    const delay = recoveryDelay(observedHeartbeatAt);
    if (delay > 0) {
      await ctx.scheduler.runAfter(delay, internal.extractor.recover, { itemId: args.itemId });
      return;
    }

    const config = extractorConfig();
    if (config) {
      try {
        await cancelJob(config.baseUrl, config.secret, args.itemId);
      } catch {
        // The guarded mutation below still returns the item to the queue. If
        // the old job remains active, the normal busy retry waits for it.
      }
    }
    await ctx.runMutation(internal.items.restartStalledExtraction, {
      itemId: args.itemId,
      observedHeartbeatAt,
    });
  },
});

export const expire = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || item.status !== "ready" || !item.expiresAt || item.expiresAt > Date.now()) return;

    const config = extractorConfig();
    if (!config) {
      await ctx.scheduler.runAfter(5 * 60_000, internal.extractor.expire, args);
      return;
    }
    try {
      await cancelJob(config.baseUrl, config.secret, args.itemId);
    } catch {
      await ctx.scheduler.runAfter(5 * 60_000, internal.extractor.expire, args);
      return;
    }
    await ctx.runMutation(internal.items.deleteExpired, {
      itemId: args.itemId,
      observedExpiresAt: item.expiresAt,
    });
  },
});

export const cleanupExpired = internalAction({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.runQuery(internal.items.expiredReadyItems, { now: Date.now() });
    await Promise.all(
      items.map((item: Doc<"items">) =>
        ctx.scheduler.runAfter(0, internal.extractor.expire, { itemId: item._id }),
      ),
    );
  },
});

// A waiting item (premiere/live) goes back through the probe.
export const recheck = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || item.status !== "waiting") return;
    await ctx.runMutation(internal.items.requeue, { itemId: args.itemId });
  },
});

export const cancel = internalAction({
  args: { itemId: v.id("items") },
  handler: async (_ctx, args) => {
    const config = extractorConfig();
    if (!config) return;
    try {
      await cancelJob(config.baseUrl, config.secret, args.itemId);
    } catch {
      // The Worker recycles jobs on its own; a failed cancel is not fatal.
    }
  },
});

export const restart = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const config = extractorConfig();
    if (config) {
      try {
        await cancelJob(config.baseUrl, config.secret, args.itemId);
      } catch {
        await ctx.scheduler.runAfter(60_000, internal.extractor.restart, args);
        return;
      }
    }
    await ctx.runMutation(internal.items.queueAfterCancel, { itemId: args.itemId });
  },
});

export const diagnostics = action({
  args: { id: v.id("items") },
  handler: async (ctx, args): Promise<DiagnosticsResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");
    const item: Doc<"items"> | null = await ctx.runQuery(internal.items.ownedItemForDiagnostics, {
      itemId: args.id,
      clerkId: identity.subject,
    });
    if (!item) throw new Error("Item not found");

    const config = extractorConfig();
    let extractor: ExtractorHealth | { ok: false; error: string } = {
      ok: false,
      error: "Extractor not configured",
    };
    if (config) {
      try {
        extractor = await health(config.baseUrl, config.secret);
      } catch (error) {
        extractor = { ok: false, error: String((error as Error)?.message ?? error) };
      }
    }
    return {
      serverTime: Date.now(),
      item: {
        id: item._id,
        status: item.status,
        phase: item.phase,
        error: item.error,
        attempts: item.attempts ?? 0,
        extractionStartedAt: item.extractionStartedAt,
        lastHeartbeatAt: item.lastHeartbeatAt,
        recoveryAt: item.lastHeartbeatAt ? item.lastHeartbeatAt + 5 * 60_000 : undefined,
      },
      extractor,
    };
  },
});

export const deleteItem = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || item.status !== "deleting") return;
    const config = extractorConfig();
    if (!config) {
      await ctx.scheduler.runAfter(5 * 60_000, internal.extractor.deleteItem, args);
      return;
    }
    try {
      await cancelJob(config.baseUrl, config.secret, args.itemId);
    } catch {
      await ctx.scheduler.runAfter(5 * 60_000, internal.extractor.deleteItem, args);
      return;
    }
    await ctx.runMutation(internal.items.finishDelete, { itemId: args.itemId });
  },
});
