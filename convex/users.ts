import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { feedBaseUrl, feedUrl, getOrCreateUserFeed, randomFeedToken } from "./feeds";

export async function currentUser(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
}

// Called from mutations (items.add and friends) so a user row exists the first
// time an authenticated person touches the queue.
export async function getOrCreateUser(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("You are signed out. Sign in and try again");
  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (existing) return existing;
  const now = Date.now();
  const feedToken = randomFeedToken();
  const feedId = await ctx.db.insert("feeds", { feedToken, createdAt: now });
  const id = await ctx.db.insert("users", {
    clerkId: identity.subject,
    feedId,
    feedToken,
    createdAt: now,
  });
  return (await ctx.db.get(id))!;
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return { feedUrl: null };
    const feed = user.feedId ? await ctx.db.get(user.feedId) : null;
    // A user the backfill has not reached yet still gets the right URL: their
    // feed is created carrying the token they already have, so both branches
    // produce the same string.
    return {
      feedUrl: feed ? feedUrl(feed) : `${feedBaseUrl()}/feed/${encodeURIComponent(user.feedToken)}`,
    };
  },
});

export const syncProfile = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You are signed out. Sign in and try again");

    const displayName = args.displayName.trim().slice(0, 100);
    if (!displayName) return;

    const user = await getOrCreateUser(ctx);
    if (user.displayName !== displayName) {
      await ctx.db.patch(user._id, { displayName });
    }
  },
});

export const rotateFeedToken = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("You are signed out. Sign in and try again");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new ConvexError("Feed not found");

    const feed = await getOrCreateUserFeed(ctx, user);
    const feedToken = randomFeedToken();
    await ctx.db.patch(feed._id, { feedToken });
    await ctx.db.patch(user._id, { feedToken });
    // Stored media URLs are signed with the old token, so they must be dropped
    // and re-signed on the next feed build.
    const items = await ctx.db
      .query("items")
      .withIndex("by_feed", (q) => q.eq("feedId", feed._id))
      .collect();
    await Promise.all(items.map((item) => ctx.db.patch(item._id, { mediaUrl: undefined })));
    return { feedUrl: feedUrl({ ...feed, feedToken }) };
  },
});
