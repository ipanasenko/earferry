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
  // A feed is the thing a podcast app subscribes to, and the thing items belong
  // to. Most feeds are private and owned by one user; the public demo showroom
  // is a feed with no owner. Keeping this separate from `users` is what stops
  // the public feed from needing a fake Clerk account.
  feeds: defineTable({
    feedToken: v.string(),
    // Set only on public feeds, which are reachable at /feed/{slug}. A private
    // feed has no slug and is reachable only by its unguessable token.
    slug: v.optional(v.string()),
    // Public feeds carry their own branding. A private feed takes its title
    // from its owner's display name instead.
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    // A permanent feed is a showroom: its episodes are never given an
    // `expiresAt`, so the demo enclosures cannot go dead underneath the
    // homepage. Nothing else in the system deletes ready audio.
    permanent: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_feed_token", ["feedToken"])
    .index("by_slug", ["slug"]),

  users: defineTable({
    clerkId: v.string(),
    // Every user owns exactly one feed, created in the same mutation as the
    // user. Optional only because Convex has no way to express that.
    feedId: v.optional(v.id("feeds")),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_feed", ["feedId"]),

  items: defineTable({
    // Every item belongs to a feed. Optional only because Convex has no way to
    // express that, the same as users.feedId.
    feedId: v.optional(v.id("feeds")),
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
    // Minted per extraction attempt and echoed back by the extractor Worker,
    // so callbacks from a superseded attempt are fenced out.
    attemptToken: v.optional(v.string()),
    lastHeartbeatAt: v.optional(v.number()),
    r2Key: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    // Signed Worker media URL, stored when the item becomes ready.
    mediaUrl: v.optional(v.string()),
    // Automatic retry attempts for the current extraction (bounded backoff).
    attempts: v.optional(v.number()),
    // When a queued item becomes due. The dispatcher starts the oldest due
    // queued item, so extraction is first-in-first-out across all users.
    nextAttemptAt: v.optional(v.number()),
    artworkUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_feed", ["feedId", "position"])
    .index("by_feed_video", ["feedId", "videoId"])
    .index("by_status_expires", ["status", "expiresAt"])
    .index("by_status_next", ["status", "nextAttemptAt"]),
});
