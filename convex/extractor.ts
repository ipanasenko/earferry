import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { isWaitingLiveStatus, publishedDate } from "./domain";
import { feedBaseUrl } from "./users";

// HTTP contract of the shared extractor container (see the private repo,
// docs/plans/shared-extractor.md and container/server.js):
//   POST /probe            { url } -> yt-dlp metadata JSON
//   POST /extract          { id, url, callbackBase, token } -> 202 { accepted, id }
//   DELETE /jobs/:id       -> { cancelled, id } | 404
//   GET /health            -> { ok, busy, job, tokenProvider }
// The container then drives the multipart callback sequence against
// {callbackBase} with `authorization: Bearer {token}` (see convex/http.ts).

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

function extractorConfig(): { baseUrl: string; secret: string } | null {
  const baseUrl = process.env.EXTRACTOR_URL?.replace(/\/$/, "");
  if (!baseUrl) return null;
  return { baseUrl, secret: process.env.INTERNAL_SECRET ?? "" };
}

// The extractor answers errors as JSON { error }, so unwrap before the text
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

async function extractorFetch(
  baseUrl: string,
  secret: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
      ...(init.headers ?? {}),
    },
  });
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
  job: { id: string; url: string; callbackBase: string; token: string },
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

export async function cancelJob(baseUrl: string, secret: string, id: string): Promise<void> {
  const response = await extractorFetch(baseUrl, secret, `/jobs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (response.ok || response.status === 404) return;
  throw new Error(`Container cancellation failed (${response.status})`);
}

export async function health(baseUrl: string, secret: string): Promise<ExtractorHealth> {
  const response = await extractorFetch(baseUrl, secret, "/health");
  if (!response.ok) throw new Error(`Extractor health check failed (${response.status})`);
  return (await response.json()) as ExtractorHealth;
}

export const run = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || !["queued", "probing"].includes(item.status)) return;

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
      await ctx.runMutation(internal.items.setStatus, {
        itemId: args.itemId,
        status: "probing",
        phase: "Checking video",
      });
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
          phase: "Waiting until YouTube reports that the video is fully available",
        });
        await ctx.scheduler.runAfter(5 * 60_000, internal.extractor.recheck, {
          itemId: args.itemId,
        });
        return;
      }

      await ctx.runMutation(internal.items.setStatus, {
        itemId: args.itemId,
        status: "extracting",
        phase: "Starting audio extraction",
      });
      await startExtraction(baseUrl, secret, {
        id: args.itemId,
        url: item.url,
        callbackBase: `${feedBaseUrl()}/internal/extract-callback/${args.itemId}`,
        token: secret,
      });
    } catch (error) {
      await ctx.runMutation(internal.items.markFailed, {
        itemId: args.itemId,
        detail: String((error as Error)?.message ?? error).slice(0, 500),
      });
    }
  },
});

// A waiting item (premiere/live) goes back through the probe.
export const recheck = internalAction({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.items.get, { itemId: args.itemId });
    if (!item || item.status !== "waiting") return;
    await ctx.runMutation(internal.items.setStatus, {
      itemId: args.itemId,
      status: "queued",
    });
    await ctx.scheduler.runAfter(0, internal.extractor.run, { itemId: args.itemId });
  },
});

export const cancel = internalAction({
  args: { itemId: v.id("items") },
  handler: async (_ctx, args) => {
    const config = extractorConfig();
    if (!config) return;
    try {
      await cancelJob(config.baseUrl, config.secret, args.itemId as Id<"items"> as string);
    } catch {
      // The container recycles jobs on its own; a failed cancel is not fatal.
    }
  },
});
