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
  normalizeYouTubeUrl,
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

function scheduleExtraction(ctx: MutationCtx, itemId: Id<"items">) {
  return ctx.scheduler.runAfter(0, internal.extractor.run, { itemId });
}

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
        await ctx.db.patch(existing._id, {
          position,
          addedAt: now,
          status: "queued",
          phase: undefined,
          error: undefined,
          attempts: 0,
          r2Key: undefined,
          sizeBytes: undefined,
          mediaUrl: undefined,
          expiresAt: undefined,
        });
        await scheduleExtraction(ctx, existing._id);
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
    });
    await scheduleExtraction(ctx, itemId);
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
    await ctx.db.patch(item._id, {
      status: "queued",
      phase: undefined,
      error: undefined,
      attempts: 0,
    });
    await scheduleExtraction(ctx, item._id);
  },
});

export const queueAfterCancel = internalMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !["extracting", "uploading"].includes(item.status)) return false;
    await ctx.db.patch(args.itemId, {
      status: "queued",
      phase: "Starting a fresh extraction",
      error: undefined,
      attempts: 0,
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.extractor.run, { itemId: args.itemId });
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

export const beginProbe = internalMutation({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !["queued", "probing"].includes(item.status)) return false;
    const now = Date.now();
    await ctx.db.patch(args.itemId, {
      status: "probing",
      phase: "Checking video",
      extractionStartedAt: now,
    });
    await ctx.scheduler.runAfter(EXTRACTION_LEASE_MS, internal.items.recoverProbe, {
      itemId: args.itemId,
      startedAt: now,
    });
    return true;
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
    if (!item || item.status !== "probing") return;
    const now = Date.now();
    await ctx.db.patch(args.itemId, {
      status: "extracting",
      phase: "Starting audio extraction",
      extractionStartedAt: now,
      lastHeartbeatAt: now,
    });
    await ctx.scheduler.runAfter(EXTRACTION_LEASE_MS, internal.extractor.recover, {
      itemId: args.itemId,
    });
  },
});

export const recordHeartbeat = internalMutation({
  args: {
    itemId: v.id("items"),
    status: v.union(v.literal("extracting"), v.literal("uploading")),
    phase: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || !["extracting", "uploading"].includes(item.status)) return false;
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
    await ctx.db.patch(args.itemId, {
      status: "queued",
      phase: "Extraction stopped responding. Trying again",
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.extractor.run, { itemId: args.itemId });
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
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return;
    const expiresAt = Date.now() + AUDIO_RETENTION_MS;
    await ctx.db.patch(args.itemId, {
      status: "ready",
      phase: undefined,
      error: undefined,
      attempts: 0,
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
    return true;
  },
});

// Bounded automatic retry for retryable extractor failures.
const MAX_AUTO_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 60_000;

async function retryOrFailItem(
  ctx: MutationCtx,
  item: Doc<"items">,
  detail: string,
  retryable: boolean,
) {
  const attempts = item.attempts ?? 0;
  if (retryable && attempts < MAX_AUTO_RETRIES) {
    const delay = RETRY_BASE_DELAY_MS * 2 ** attempts; // 1m, 2m, 4m
    await ctx.db.patch(item._id, {
      status: "queued",
      attempts: attempts + 1,
      phase: `Extraction failed, retrying (attempt ${attempts + 2})`,
      error: undefined,
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
    });
    await ctx.scheduler.runAfter(delay, internal.extractor.run, { itemId: item._id });
    return;
  }
  const failure = describeFailure(detail);
  await ctx.db.patch(item._id, {
    status: "failed",
    phase: undefined,
    error: `${failure.message}: ${detail}`.slice(0, 500),
    extractionStartedAt: undefined,
    lastHeartbeatAt: undefined,
  });
}

export const retryOrFail = internalMutation({
  args: { itemId: v.id("items"), detail: v.string(), retryable: v.boolean() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status === "ready") return;
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
      extractionStartedAt: undefined,
      lastHeartbeatAt: undefined,
    });
  },
});
