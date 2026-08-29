import { v } from "convex/values";
import { internalMutation, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { isExpiredReady, normalizeYouTubeUrl, youtubeVideoId } from "./domain";

/**
 * A feed is what a podcast app subscribes to and what items belong to. Private
 * user feeds and the public demo showroom are two shapes of the same record,
 * which is what keeps the public feed from needing a fake Clerk account.
 */

export const SAMPLE_FEED_SLUG = "sample";

/**
 * The ten Sample Crossings, published on EarFerry's own YouTube channel. Held
 * here rather than passed in so `convex deploy --preview-run` can seed a fresh
 * preview deployment with no arguments, and so every deployment ends up with
 * the same showroom.
 */
export const SAMPLE_CROSSING_URLS = [
  "https://www.youtube.com/watch?v=m0BY3VGZppw",
  "https://www.youtube.com/watch?v=BQsva8tluKc",
  "https://www.youtube.com/watch?v=Kq6ooovtrGQ",
  "https://www.youtube.com/watch?v=gy1OC72og_0",
  "https://www.youtube.com/watch?v=fTlBZsEAHO0",
  "https://www.youtube.com/watch?v=rROruufu6NE",
  "https://www.youtube.com/watch?v=KkpxZinP25A",
  "https://www.youtube.com/watch?v=KYrvw5bwVB0",
  "https://www.youtube.com/watch?v=8JIFsJB0TzE",
  "https://www.youtube.com/watch?v=n0Sih23t3Ww",
];

const SAMPLE_FEED_TITLE = "EarFerry · Sample Crossings";
const SAMPLE_FEED_DESCRIPTION =
  "Ten short, original AI-narrated episodes demonstrating how EarFerry looks and plays in a podcast app.";

export function randomFeedToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function feedBaseUrl(): string {
  // HTTP actions live on the .convex.site domain. CONVEX_SITE_URL is a Convex
  // built-in env var; FEED_BASE_URL overrides it once a custom domain exists.
  const base = process.env.FEED_BASE_URL ?? process.env.CONVEX_SITE_URL;
  if (!base) throw new Error("FEED_BASE_URL or CONVEX_SITE_URL must be set");
  return base.replace(/\/$/, "");
}

/** The path a subscriber uses. Public feeds show a slug and hide their token. */
export function feedPath(feed: Doc<"feeds">): string {
  return feed.slug
    ? `/feed/${encodeURIComponent(feed.slug)}`
    : `/feed/${encodeURIComponent(feed.feedToken)}`;
}

export function feedUrl(feed: Doc<"feeds">): string {
  return `${feedBaseUrl()}${feedPath(feed)}`;
}

export async function feedByToken(ctx: QueryCtx, feedToken: string) {
  return await ctx.db
    .query("feeds")
    .withIndex("by_feed_token", (q) => q.eq("feedToken", feedToken))
    .unique();
}

export async function feedBySlug(ctx: QueryCtx, slug: string) {
  return await ctx.db
    .query("feeds")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
}

/**
 * One path segment resolves either shape. A slug is tried first so a public
 * feed can never be shadowed by a token, and slugs are short enough that they
 * could never collide with a 64-character token anyway.
 */
export async function resolveFeed(ctx: QueryCtx, tokenOrSlug: string) {
  return (await feedBySlug(ctx, tokenOrSlug)) ?? (await feedByToken(ctx, tokenOrSlug));
}

/** The owner of a private feed, or null for the public showroom. */
export async function feedOwner(ctx: QueryCtx, feedId: Id<"feeds">) {
  return await ctx.db
    .query("users")
    .withIndex("by_feed", (q) => q.eq("feedId", feedId))
    .unique();
}

export async function feedItems(ctx: QueryCtx, feedId: Id<"feeds">) {
  return await ctx.db
    .query("items")
    .withIndex("by_feed", (q) => q.eq("feedId", feedId))
    .order("desc")
    .collect();
}

export async function readyFeedItems(ctx: QueryCtx, feedId: Id<"feeds">) {
  const items = await feedItems(ctx, feedId);
  return items.filter((item) => item.status === "ready" && !isExpiredReady(item));
}

/**
 * Every user owns exactly one private feed. Created lazily so the backfill and
 * a brand-new sign-in converge on the same shape, and seeded with the user's
 * existing token so feed URLs already in podcast apps keep working.
 */
export async function getOrCreateUserFeed(
  ctx: MutationCtx,
  user: Doc<"users">,
): Promise<Doc<"feeds">> {
  if (user.feedId) {
    const existing = await ctx.db.get(user.feedId);
    if (existing) return existing;
  }
  // Reuse the user's own token where they still carry one, so a feed URL
  // already sitting in a podcast app keeps working.
  const byToken = user.feedToken ? await feedByToken(ctx, user.feedToken) : null;
  const feedId = byToken
    ? byToken._id
    : await ctx.db.insert("feeds", {
        feedToken: user.feedToken ?? randomFeedToken(),
        createdAt: user.createdAt,
      });
  await ctx.db.patch(user._id, { feedId });
  // Adopt this user's pre-feeds items in the same mutation. Without it their
  // queue would read as empty between the feed appearing and the sweep
  // reaching them, because list() switches to by_feed as soon as feedId is set.
  const owned = await ctx.db
    .query("items")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  await Promise.all(
    owned.filter((item) => !item.feedId).map((item) => ctx.db.patch(item._id, { feedId })),
  );
  return (await ctx.db.get(feedId))!;
}

/** The public demo showroom, created on first use. */
async function getOrCreateSampleFeed(ctx: MutationCtx): Promise<Doc<"feeds">> {
  const existing = await feedBySlug(ctx, SAMPLE_FEED_SLUG);
  if (existing) return existing;
  const feedId = await ctx.db.insert("feeds", {
    feedToken: randomFeedToken(),
    slug: SAMPLE_FEED_SLUG,
    title: SAMPLE_FEED_TITLE,
    description: SAMPLE_FEED_DESCRIPTION,
    permanent: true,
    createdAt: Date.now(),
  });
  return (await ctx.db.get(feedId))!;
}

/** Idempotent, so it is safe to run by hand on any deployment. */
export const ensureSampleFeed = internalMutation({
  args: {},
  handler: async (ctx) => {
    const feed = await getOrCreateSampleFeed(ctx);
    return { feedId: feed._id, slug: feed.slug };
  },
});

/**
 * Gives every pre-feeds user and item a feed. Idempotent and resumable: it
 * only touches rows that still lack a feedId, so it can be run repeatedly
 * until it reports nothing left.
 */
export const backfill = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 200;

    const users = await ctx.db
      .query("users")
      .withIndex("by_feed", (q) => q.eq("feedId", undefined))
      .take(batchSize);
    for (const user of users) await getOrCreateUserFeed(ctx, user);

    const items = await ctx.db
      .query("items")
      .withIndex("by_feed", (q) => q.eq("feedId", undefined))
      .take(batchSize);
    let itemsPatched = 0;
    for (const item of items) {
      if (!item.userId) continue;
      const owner = await ctx.db.get(item.userId);
      if (!owner) continue;
      const feed = await getOrCreateUserFeed(ctx, owner);
      await ctx.db.patch(item._id, { feedId: feed._id });
      itemsPatched += 1;
    }

    return {
      usersPatched: users.length,
      itemsPatched,
      done: users.length < batchSize && items.length < batchSize,
    };
  },
});

/**
 * Fills the public showroom. Idempotent: a URL already in the feed is skipped,
 * so this can be re-run after a partial failure, and it is safe as the
 * `--preview-run` hook on every preview deployment.
 *
 *   npx convex run --prod feeds:seedSampleFeed
 */
export const seedSampleFeed = internalMutation({
  args: { urls: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const feed = await getOrCreateSampleFeed(ctx);

    const now = Date.now();
    const existing = await feedItems(ctx, feed._id);
    let position = existing.reduce((top, item) => Math.max(top, item.position), 0);
    let added = 0;

    for (const raw of args.urls ?? SAMPLE_CROSSING_URLS) {
      const url = normalizeYouTubeUrl(raw);
      const videoId = youtubeVideoId(url);
      if (existing.some((item) => item.videoId === videoId)) continue;
      position += 1;
      await ctx.db.insert("items", {
        feedId: feed._id,
        url,
        videoId,
        addedAt: now,
        position,
        status: "queued",
        nextAttemptAt: now,
      });
      added += 1;
    }

    if (added > 0) await ctx.scheduler.runAfter(0, internal.items.dispatchNext, {});
    return { feedId: feed._id, added, alreadyPresent: existing.length };
  },
});

/**
 * A feed with no slug and no owner: the same shape a user's private feed has
 * on the wire, without needing a Clerk account. It exists so a disposable
 * preview deployment can exercise resolution by token, which is the path that
 * broke in #39, without handing CI a real subscriber's credential.
 *
 * Idempotent: an ownerless, slug-less feed is unambiguous, because every real
 * private feed has an owner and every public one has a slug.
 */
/**
 * Clears the columns the feeds module replaced: items.userId, superseded by
 * feedId, and users.feedToken, superseded by the token on the feed itself.
 *
 * Convex validates existing documents against the schema, so the fields cannot
 * be removed from schema.ts until every row has stopped carrying them. Run this
 * to completion on a deployment before pushing the narrowed schema.
 *
 *   npx convex run --prod feeds:stripLegacyColumns
 */
export const stripLegacyColumns = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 200;

    const items = (await ctx.db.query("items").take(batchSize * 4)).filter(
      (item) => item.userId !== undefined,
    );
    for (const item of items.slice(0, batchSize)) {
      await ctx.db.patch(item._id, { userId: undefined });
    }

    const users = (await ctx.db.query("users").take(batchSize * 4)).filter(
      (user) => user.feedToken !== undefined,
    );
    for (const user of users.slice(0, batchSize)) {
      await ctx.db.patch(user._id, { feedToken: undefined });
    }

    return {
      itemsStripped: Math.min(items.length, batchSize),
      usersStripped: Math.min(users.length, batchSize),
      done: items.length <= batchSize && users.length <= batchSize,
    };
  },
});

export const seedTestPrivateFeed = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const feed of await ctx.db.query("feeds").collect()) {
      if (feed.slug) continue;
      if (await feedOwner(ctx, feed._id)) continue;
      return { feedToken: feed.feedToken };
    }
    const feedToken = randomFeedToken();
    await ctx.db.insert("feeds", { feedToken, createdAt: Date.now() });
    return { feedToken };
  },
});
