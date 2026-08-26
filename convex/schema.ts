import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const itemStatus = v.union(
  v.literal("queued"),
  v.literal("probing"),
  v.literal("waiting"),
  v.literal("extracting"),
  v.literal("uploading"),
  v.literal("ready"),
  v.literal("failed"),
  v.literal("deleting"),
);

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    feedToken: v.string(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_feed_token", ["feedToken"]),

  items: defineTable({
    userId: v.id("users"),
    url: v.string(),
    videoId: v.string(),
    title: v.optional(v.string()),
    channel: v.optional(v.string()),
    description: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    addedAt: v.number(),
    position: v.number(),
    status: itemStatus,
    phase: v.optional(v.string()),
    error: v.optional(v.string()),
    extractionStartedAt: v.optional(v.number()),
    lastHeartbeatAt: v.optional(v.number()),
    r2Key: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    // Signed Worker media URL, stored when the item becomes ready.
    mediaUrl: v.optional(v.string()),
    // Automatic retry attempts for the current extraction (bounded backoff).
    attempts: v.optional(v.number()),
    artworkUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "position"])
    .index("by_user_video", ["userId", "videoId"])
    .index("by_status_expires", ["status", "expiresAt"]),
});
