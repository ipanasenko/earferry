import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  EXTRACTION_LEASE_MS,
  isExpiredReady,
  MAX_AUTO_RETRIES,
  normalizeYouTubeUrl,
  retryDelayMs,
  youtubeVideoId,
  describeFailure,
} from "./domain";
import { currentUser, getOrCreateUser, requirePaidEntitlement } from "./users";

const AUDIO_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

async function topPosition(ctx: MutationCtx, userId: Id<"users">): Promise<number> {
  const top = await ctx.db
    .query("items")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
  return (top?.position ?? 0) + 1;
}

async function ownedItem(ctx: MutationCtx, id: Id<"items">): Promise<Doc<"items">> {
  const user = await getOrCreateUser(ctx);
  const item = await ctx.db.get(id);
  if (!item || item.userId !== user._id) throw new ConvexError("Item not found");
  return item;
}

// Puts an item at the back of the extraction queue and wakes the dispatcher:
// once now (the slot may already be free for another item) and once when this
// item becomes due.
async function enqueueItem(
  ctx: MutationCtx,
  itemId: Id<"items">,
  patch: Partial<Doc<"items">>,
  delayMs = 0,
): Promise<void> {
  await ctx.db.patch(itemId, {
    ...patch,
    status: "queued",
    nextAttemptAt: Date.now() + delayMs,
    attemptToken: undefined,
    extractionStartedAt: undefined,
    lastHeartbeatAt: undefined,
  });
  await ctx.scheduler.runAfter(0, internal.items.dispatchNext, {});
  if (delayMs > 0) await ctx.scheduler.runAfter(delayMs, internal.items.dispatchNext, {});
}

function wakeDispatcher(ctx: MutationCtx) {
  return ctx.scheduler.runAfter(0, internal.items.dispatchNext, {});
}

// The extractor runs one video at a time, so pickup order is decided here:
// the oldest due queued item goes first, across all users. The claim happens
// inside this transaction, so two overlapping dispatchers cannot start two
// runs. Kicked whenever an item enters the queue or an attempt ends, with a
// cron sweep as the backstop for lost kicks.
export const dispatchNext = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const status of ["probing", "extracting", "uploading"] as const) {
      const busy = await ctx.db
        .query("items")
        .withIndex("by_status_next", (q) => q.eq("status", status))
        .first();
      if (busy) return; // The attempt's terminal transition re-kicks us.
    }
    const now = Date.now();
    const due = await ctx.db
      .query("items")
      .withIndex("by_status_next", (q) => q.eq("status", "queued").lte("nextAttemptAt", now))
      .order("asc")
      .first();
    if (!due) {
      const upcoming = await ctx.db
        .query("items")
        .withIndex("by_status_next", (q) => q.eq("status", "queued"))
        .order("asc")
        .first();
      if (upcoming?.nextAttemptAt) {
        await ctx.scheduler.runAt(upcoming.nextAttemptAt, internal.items.dispatchNext, {});
      }
      return;
    }
    await ctx.db.patch(due._id, {
      status: "probing",
      phase: "Checking video",
      extractionStartedAt: now,
    });
    await ctx.scheduler.runAfter(EXTRACTION_LEASE_MS, internal.items.recoverProbe, {
      itemId: due._id,
      startedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.extractor.run, { itemId: due._id });
  },
});

// Requeue an in-flight or waiting item, used by the extractor action.
export const requeue = internalMutation({
  args: {
    itemId: v.id("items"),
    phase: v.optional(v.string()),
    delayMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || ["ready", "deleting"].includes(item.status)) return;
    await enqueueItem(ctx, args.itemId, { phase: args.phase }, args.delayMs ?? 0);
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const items = await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return items.filter((item) => item.status !== "deleting");
  },
});

export const add = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    await requirePaidEntitlement(ctx);
    const url = normalizeYouTubeUrl(args.url);
    const videoId = youtubeVideoId(url);
    const user = await getOrCreateUser(ctx);
    const now = Date.now();

    const existing = await ctx.db
      .query("items")
      .withIndex("by_user_video", (q) => q.eq("userId", user._id).eq("videoId", videoId))
      .unique();

    if (existing) {
      const position = await topPosition(ctx, user._id);
      if (existing.status === "deleting") {
        throw new ConvexError("This video is still being deleted. Try again shortly");
      }
      if (existing.status === "failed" || isExpiredReady(existing, now)) {
        // A re-added failed item gets a fresh attempt, not just a new spot.
        await enqueueItem(ctx, existing._id, {
          position,
          addedAt: now,
          phase: undefined,
          error: undefined,
          attempts: 0,
          r2Key: undefined,
          sizeBytes: undefined,
          mediaUrl: undefined,
          expiresAt: undefined,
        });
      } else {
        await ctx.db.patch(existing._id, { position, addedAt: now });
      }
      return existing._id;
    }

    const itemId = await ctx.db.insert("items", {
      userId: user._id,
      url,
      videoId,
      addedAt: now,
      position: await topPosition(ctx, user._id),
      status: "queued",
      nextAttemptAt: now,
    });
    await wakeDispatcher(ctx);
    return itemId;
  },
});

export const remove = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ownedItem(ctx, args.id);
    await ctx.db.patch(item._id, { status: "deleting", phase: "Removing files" });
    await ctx.scheduler.runAfter(0, internal.extractor.deleteItem, { itemId: item._id });
  },
});

export const retry = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    await requirePaidEntitlement(ctx);
    const item = await ownedItem(ctx, args.id);
    if (
      !["failed", "waiting", "ready", "extracting", "uploading", "queued", "probing"].includes(
        item.status,
      )
    ) {
      throw new ConvexError("This item cannot be retried yet");
    }
    if (["extracting", "uploading"].includes(item.status)) {
      await ctx.db.patch(item._id, { phase: "Cancelling the current extraction" });
      await ctx.scheduler.runAfter(0, internal.extractor.restart, { itemId: item._id });
      return;
    }
    await enqueueItem(ctx, item._id, { phase: undefined, error: undefined, attempts: 0 });
  },
});

export const queueAfterCancel = internalMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !["extracting", "uploading"].includes(item.status)) return false;
    await enqueueItem(ctx, args.itemId, {
      phase: "Starting a fresh extraction",
      error: undefined,
      attempts: 0,
    });
    return true;
  },
});

// ---- Internal plumbing used by the extractor action and HTTP callbacks. ----

export const get = internalQuery({
  args: { itemId: v.id("items") },
  handler: (ctx, args) => ctx.db.get(args.itemId),
});

export const userByFeedToken = internalQuery({
  args: { feedToken: v.string() },
  handler: (ctx, args) =>
    ctx.db
      .query("users")
      .withIndex("by_feed_token", (q) => q.eq("feedToken", args.feedToken))
      .unique(),
});

export const readyItemsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
    return items.filter((item) => item.status === "ready" && !isExpiredReady(item));
  },
});

export const expiredReadyItems = internalQuery({
  args: { now: v.number() },
  handler: (ctx, args) =>
    ctx.db
      .query("items")
      .withIndex("by_status_expires", (q) => q.eq("status", "ready").lte("expiresAt", args.now))
      .take(50),
});

export const setStatus = internalMutation({
  args: {
    itemId: v.id("items"),
    status: v.union(
      v.literal("queued"),
      v.literal("probing"),
      v.literal("waiting"),
      v.literal("extracting"),
      v.literal("uploading"),
      v.literal("ready"),
      v.literal("failed"),
      v.literal("deleting"),
    ),
    phase: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;
    await ctx.db.patch(args.itemId, {
      status: args.status,
      phase: args.phase,
      error: args.error,
    });
  },
});

// A probe whose action died (deploy, crash, killed runtime) leaves the item in
// "probing" with nobody coming back for it. This fires one lease later;
// startedAt ties it to a specific attempt so a newer probe is left alone.
export const recoverProbe = internalMutation({
  args: { itemId: v.id("items"), startedAt: v.number() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status !== "probing" || item.extractionStartedAt !== args.startedAt) return;
    await retryOrFailItem(ctx, item, "The video check stopped before it finished", true);
  },
});

export const beginExtraction = internalMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status !== "probing") return null;
    const now = Date.now();
    const attemptToken = crypto.randomUUID();
    await ctx.db.patch(args.itemId, {
      status: "extracting",
      phase: "Starting audio extraction",
      attemptToken,
      extractionStartedAt: now,
      lastHeartbeatAt: now,
    });
    await ctx.scheduler.runAfter(EXTRACTION_LEASE_MS, internal.extractor.recover, {
      itemId: args.itemId,
    });
    return attemptToken;
  },
});

export const recordHeartbeat = internalMutation({
  args: {
    itemId: v.id("items"),
    status: v.union(v.literal("extracting"), v.literal("uploading")),
    phase: v.optional(v.string()),
    attempt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !["extracting", "uploading"].includes(item.status)) return false;
    if (item.attemptToken && args.attempt !== item.attemptToken) return false;
    await ctx.db.patch(args.itemId, {
      status: args.status,
      phase: args.phase ?? item.phase,
      lastHeartbeatAt: Date.now(),
    });
    return true;
  },
});

export const restartStalledExtraction = internalMutation({
  args: { itemId: v.id("items"), observedHeartbeatAt: v.number() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (
      !item ||
      !["extracting", "uploading"].includes(item.status) ||
      item.lastHeartbeatAt !== args.observedHeartbeatAt
    ) {
      return false;
    }
    await enqueueItem(ctx, args.itemId, { phase: "Extraction stopped responding. Trying again" });
    return true;
  },
});

export const recordProbe = internalMutation({
  args: {
    itemId: v.id("items"),
    title: v.optional(v.string()),
    channel: v.optional(v.string()),
    description: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    artworkUrl: v.optional(v.string()),
  },
  handler: async (ctx, { itemId, ...metadata }) => {
    const item = await ctx.db.get(itemId);
    if (!item) return;
    await ctx.db.patch(itemId, metadata);
  },
});

export const markReady = internalMutation({
  args: {
    itemId: v.id("items"),
    r2Key: v.string(),
    sizeBytes: v.optional(v.number()),
    mediaUrl: v.optional(v.string()),
    title: v.optional(v.string()),
    channel: v.optional(v.string()),
    description: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    artworkUrl: v.optional(v.string()),
    attempt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return false;
    // A completion from a superseded attempt must not publish; the Worker
    // deletes its R2 objects when this answers with a rejection.
    if (item.attemptToken && args.attempt !== item.attemptToken) return false;
    const expiresAt = Date.now() + AUDIO_RETENTION_MS;
    await ctx.db.patch(args.itemId, {
      status: "ready",
      phase: undefined,
      error: undefined,
      attempts: 0,
      attemptToken: undefined,
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
      r2Key: args.r2Key,
      sizeBytes: args.sizeBytes,
      mediaUrl: args.mediaUrl,
      // Keep probe metadata unless the Worker sends fresher values.
      title: args.title ?? item.title,
      channel: args.channel ?? item.channel,
      description: args.description ?? item.description,
      durationSeconds: args.durationSeconds ?? item.durationSeconds,
      publishedAt: args.publishedAt ?? item.publishedAt,
      artworkUrl: args.artworkUrl ?? item.artworkUrl,
      expiresAt,
    });
    await ctx.scheduler.runAt(expiresAt, internal.extractor.expire, { itemId: args.itemId });
    // The extractor slot is free: hand it to the next queued item.
    await wakeDispatcher(ctx);
    return true;
  },
});

export const deleteExpired = internalMutation({
  args: { itemId: v.id("items"), observedExpiresAt: v.number() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.expiresAt !== args.observedExpiresAt || !isExpiredReady(item)) return false;
    await ctx.db.delete(args.itemId);
    return true;
  },
});

export const finishDelete = internalMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status !== "deleting") return false;
    await ctx.db.delete(args.itemId);
    // The deleted item may have held the extractor slot.
    await wakeDispatcher(ctx);
    return true;
  },
});

// Bounded automatic retry for retryable extractor failures.
async function retryOrFailItem(
  ctx: MutationCtx,
  item: Doc<"items">,
  detail: string,
  retryable: boolean,
) {
  const attempts = item.attempts ?? 0;
  if (retryable && attempts < MAX_AUTO_RETRIES) {
    await enqueueItem(
      ctx,
      item._id,
      {
        attempts: attempts + 1,
        phase: `Extraction failed, retrying (attempt ${attempts + 2})`,
        error: undefined,
      },
      retryDelayMs(attempts),
    );
    return;
  }
  const failure = describeFailure(detail);
  await ctx.db.patch(item._id, {
    status: "failed",
    phase: undefined,
    error: `${failure.message}: ${detail}`.slice(0, 500),
    attemptToken: undefined,
    extractionStartedAt: undefined,
    lastHeartbeatAt: undefined,
  });
  await wakeDispatcher(ctx);
}

export const retryOrFail = internalMutation({
  args: {
    itemId: v.id("items"),
    detail: v.string(),
    retryable: v.boolean(),
    attempt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status === "ready") return;
    // A failure report from a superseded attempt says nothing about the
    // current one.
    if (args.attempt !== undefined && item.attemptToken && args.attempt !== item.attemptToken) {
      return;
    }
    await retryOrFailItem(ctx, item, args.detail, args.retryable);
  },
});

// Item plus its owner, for the Worker-facing HTTP actions that need the
// owner's feed token (media URL signing).
export const itemWithUser = internalQuery({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    const user = await ctx.db.get(item.userId);
    if (!user) return null;
    return { item, user };
  },
});

export const ownedItemForDiagnostics = internalQuery({
  args: { itemId: v.id("items"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    const user = await ctx.db.get(item.userId);
    return user?.clerkId === args.clerkId ? item : null;
  },
});

export const markFailed = internalMutation({
  args: { itemId: v.id("items"), detail: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status === "ready") return;
    const failure = describeFailure(args.detail);
    await ctx.db.patch(args.itemId, {
      status: "failed",
      phase: undefined,
      error: `${failure.message}: ${args.detail}`.slice(0, 500),
      attemptToken: undefined,
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
    });
    await wakeDispatcher(ctx);
  },
});
