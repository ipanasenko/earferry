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
import { currentUser, getOrCreateUser } from "./users";
import { feedItems, feedOwner, getOrCreateUserFeed, readyFeedItems, resolveFeed } from "./feeds";

const AUDIO_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000;

export function renewedAudioExpiry(now = Date.now()): number {
  return now + AUDIO_RETENTION_MS;
}

async function topPosition(ctx: MutationCtx, feedId: Id<"feeds">): Promise<number> {
  const top = await ctx.db
    .query("items")
    .withIndex("by_feed", (q) => q.eq("feedId", feedId))
    .order("desc")
    .first();
  return (top?.position ?? 0) + 1;
}

async function ownedItem(ctx: MutationCtx, id: Id<"items">): Promise<Doc<"items">> {
  const user = await getOrCreateUser(ctx);
  const feed = await getOrCreateUserFeed(ctx, user);
  const item = await ctx.db.get(id);
  if (!item || item.feedId !== feed._id) throw new ConvexError("Item not found");
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

// Convex owns product state, not execution ordering. This submits every due
// item to the extractor's durable queue; that queue serializes the container,
// gives production work priority, and survives executor restarts. Claiming the
// rows here prevents overlapping dispatcher invocations from submitting the
// same logical attempt twice (the extractor is idempotent as a second fence).
export const dispatchNext = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("items")
      .withIndex("by_status_next", (q) => q.eq("status", "queued").lte("nextAttemptAt", now))
      .order("asc")
      .take(50);
    if (due.length === 0) {
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
    for (const item of due) {
      const startedAt = Date.now();
      await ctx.db.patch(item._id, {
        status: "probing",
        phase: "Checking video",
        extractionStartedAt: startedAt,
      });
      await ctx.scheduler.runAfter(EXTRACTION_LEASE_MS, internal.items.recoverProbe, {
        itemId: item._id,
        startedAt,
      });
      await ctx.scheduler.runAfter(0, internal.extractor.run, { itemId: item._id, startedAt });
    }
  },
});

// Requeue an in-flight or waiting item, used by the extractor action.
export const requeue = internalMutation({
  args: {
    itemId: v.id("items"),
    phase: v.optional(v.string()),
    delayMs: v.optional(v.number()),
    // Claim time of the attempt reporting back; a mismatch means the item was
    // already re-claimed and this report is stale.
    observedStartedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || ["ready", "deleting"].includes(item.status)) return;
    if (
      args.observedStartedAt !== undefined &&
      item.extractionStartedAt !== args.observedStartedAt
    ) {
      return;
    }
    await enqueueItem(ctx, args.itemId, { phase: args.phase }, args.delayMs ?? 0);
  },
});

// A ready item whose stored audio turned out to be gone goes back through
// extraction. Guarded on the observed expiry so a concurrent re-extract or
// delete is left alone.
export const requeueMissingAudio = internalMutation({
  // Optional because a permanent feed's episodes never carry an expiry; the
  // guard still fences out a concurrent re-extract or delete either way.
  args: { itemId: v.id("items"), observedExpiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status !== "ready" || item.expiresAt !== args.observedExpiresAt) return;
    await enqueueItem(ctx, args.itemId, {
      phase: "Stored audio was missing. Extracting again",
      error: undefined,
      attempts: 0,
      r2Key: undefined,
      sizeBytes: undefined,
      mediaUrl: undefined,
      expiresAt: undefined,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    // Bound explicitly: an undefined feedId is a real value in this index, so
    // it must never reach by_feed or it would match ownerless rows.
    const feedId = user?.feedId;
    if (!feedId) return [];
    const items = await ctx.db
      .query("items")
      .withIndex("by_feed", (q) => q.eq("feedId", feedId))
      .order("desc")
      .collect();
    return items
      .filter((item) => item.status !== "deleting")
      .map((item) => {
        // Old failed rows may contain extractor diagnostics. Normalize them at
        // the user-facing boundary while keeping the original detail available
        // to the internal retry classifier.
        if (item.status !== "failed" || !item.error) return item;
        return { ...item, error: describeFailure(item.error).message };
      });
  },
});

export const add = mutation({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const url = normalizeYouTubeUrl(args.url);
    const videoId = youtubeVideoId(url);
    const user = await getOrCreateUser(ctx);
    const feed = await getOrCreateUserFeed(ctx, user);
    const now = Date.now();

    const existing = await ctx.db
      .query("items")
      .withIndex("by_feed_video", (q) => q.eq("feedId", feed._id).eq("videoId", videoId))
      .unique();

    if (existing) {
      const position = await topPosition(ctx, feed._id);
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
        if (existing.status === "ready") {
          // Reusing stored audio: make sure it is actually still there.
          await ctx.scheduler.runAfter(0, internal.extractor.verifyAudio, {
            itemId: existing._id,
          });
        }
      }
      return existing._id;
    }

    const itemId = await ctx.db.insert("items", {
      feedId: feed._id,
      url,
      videoId,
      addedAt: now,
      position: await topPosition(ctx, feed._id),
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

// Everything the RSS handler needs for one request: the feed's published
// identity, its owner's display name if it has one, and its playable episodes.
// Every user owns a feed, so a token that resolves to nothing is simply wrong.
export const feedForRequest = internalQuery({
  args: { tokenOrSlug: v.string() },
  handler: async (ctx, args) => {
    const feed = await resolveFeed(ctx, args.tokenOrSlug);
    if (feed) {
      const owner = await feedOwner(ctx, feed._id);
      return {
        feed: {
          feedToken: feed.feedToken,
          slug: feed.slug,
          title: feed.title,
          description: feed.description,
        },
        owner,
        items: await readyFeedItems(ctx, feed._id),
      };
    }

    return null;
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
    // extractionStartedAt keeps the dispatcher's claim time: the run action
    // fences its failure reports by it across the whole attempt.
    await ctx.db.patch(args.itemId, {
      status: "extracting",
      phase: "Queued for extraction",
      attemptToken,
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

export const recordQueuePresence = internalMutation({
  args: {
    itemId: v.id("items"),
    attempt: v.string(),
    queued: v.boolean(),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !["extracting", "uploading"].includes(item.status)) return false;
    if (item.attemptToken !== args.attempt) return false;
    await ctx.db.patch(args.itemId, {
      phase: args.queued ? "Queued for extraction" : item.phase,
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
    if (!["extracting", "uploading"].includes(item.status)) return false;
    if (item.attemptToken && args.attempt !== item.attemptToken) return false;
    // A permanent feed is a showroom whose enclosures must not go dead, so its
    // episodes are never given a deadline. Nothing else deletes ready audio, so
    // "no expiresAt" is the whole mechanism.
    const feed = item.feedId ? await ctx.db.get(item.feedId) : null;
    const expiresAt = feed?.permanent ? undefined : renewedAudioExpiry();
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
    if (expiresAt !== undefined) {
      await ctx.scheduler.runAt(expiresAt, internal.extractor.expire, { itemId: args.itemId });
    }
    // Submit any product items that became due while this one was running.
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

// The public showroom has no owner, so nobody can press retry on it. Without
// this a failed episode stays failed forever and the demo quietly shrinks.
// Extraction failures there are usually YouTube refusing a burst of downloads,
// which clears on its own, so another attempt a day later normally works.
//
// Also re-checks that each ready enclosure is still in R2: the showroom's
// episodes never expire, so nothing else would notice an object going missing.
export const maintainPermanentFeeds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const feeds = await ctx.db.query("feeds").collect();
    let verified = 0;
    let requeued = 0;
    for (const feed of feeds.filter((candidate) => candidate.permanent)) {
      for (const item of await feedItems(ctx, feed._id)) {
        if (item.status === "ready" && !isExpiredReady(item)) {
          await ctx.scheduler.runAfter(0, internal.extractor.verifyAudio, { itemId: item._id });
          verified += 1;
        }
        if (item.status === "failed") {
          await enqueueItem(ctx, item._id, { phase: undefined, error: undefined, attempts: 0 });
          requeued += 1;
        }
      }
    }
    return { verified, requeued };
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
    error: failure.message,
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
    observedStartedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || ["ready", "deleting"].includes(item.status)) return;
    // A failure report from a superseded attempt says nothing about the
    // current one.
    if (args.attempt !== undefined && item.attemptToken && args.attempt !== item.attemptToken) {
      return;
    }
    if (
      args.observedStartedAt !== undefined &&
      item.extractionStartedAt !== args.observedStartedAt
    ) {
      return;
    }
    await retryOrFailItem(ctx, item, args.detail, args.retryable);
  },
});

// Item plus its feed, for the Worker-facing HTTP actions that need the feed
// token (media URL signing). The owner comes along for analytics attribution
// and is absent for the ownerless public feed.
export const itemWithFeed = internalQuery({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item?.feedId) return null;
    const feed = await ctx.db.get(item.feedId);
    if (!feed) return null;
    return { item, feed, owner: await feedOwner(ctx, feed._id) };
  },
});

export const ownedItemForDiagnostics = internalQuery({
  args: { itemId: v.id("items"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item?.feedId) return null;
    const owner = await feedOwner(ctx, item.feedId);
    return owner?.clerkId === args.clerkId ? item : null;
  },
});

export const markFailed = internalMutation({
  args: { itemId: v.id("items"), detail: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || ["ready", "deleting"].includes(item.status)) return;
    const failure = describeFailure(args.detail);
    await ctx.db.patch(args.itemId, {
      status: "failed",
      phase: undefined,
      error: failure.message,
      attemptToken: undefined,
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
    });
    await wakeDispatcher(ctx);
  },
});
