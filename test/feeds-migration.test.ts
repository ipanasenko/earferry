import { describe, expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { testConvex } from "./convexTest";

const YOUTUBE_URL = "https://www.youtube.com/watch?v=abcdefghijk";

describe("backfill", () => {
  test("gives a pre-feeds user a feed carrying their existing token", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        clerkId: "clerk|a",
        feedToken: "keep-me",
        createdAt: 0,
      });
      await ctx.db.insert("items", {
        userId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "ready",
      });
    });

    const result = await t.mutation(internal.feeds.backfill, {});
    expect(result.done).toBe(true);

    const state = await t.run(async (ctx) => {
      const user = (await ctx.db.query("users").collect())[0];
      const feed = await ctx.db.get(user.feedId!);
      const item = (await ctx.db.query("items").collect())[0];
      return { feedToken: feed!.feedToken, itemFeedId: item.feedId, userFeedId: user.feedId };
    });

    // The token has to survive: it is already in someone's podcast app.
    expect(state.feedToken).toBe("keep-me");
    expect(state.itemFeedId).toBe(state.userFeedId!);
  });

  test("is idempotent, so it can be re-run after a partial failure", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { clerkId: "clerk|a", feedToken: "t", createdAt: 0 });
    });

    await t.mutation(internal.feeds.backfill, {});
    const second = await t.mutation(internal.feeds.backfill, {});

    expect(second.usersPatched).toBe(0);
    expect(await t.run(async (ctx) => (await ctx.db.query("feeds").collect()).length)).toBe(1);
  });

  test("leaves the ownerless showroom alone", async () => {
    const t = testConvex();
    await t.mutation(internal.feeds.ensureSampleFeed, {});
    await t.mutation(internal.feeds.seedSampleFeed, { urls: [YOUTUBE_URL] });

    await t.mutation(internal.feeds.backfill, {});

    const ownerless = await t.run(async (ctx) =>
      (await ctx.db.query("items").collect()).every((item) => item.userId === undefined),
    );
    expect(ownerless).toBe(true);
  });
});

describe("the queue a signed-in person sees", () => {
  test("shows their items once the backfill has adopted them", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert("users", {
        clerkId: "clerk|a",
        feedToken: "t",
        createdAt: 0,
      });
      await ctx.db.insert("items", {
        userId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "ready",
      });
    });

    await t.mutation(internal.feeds.backfill, {});

    const items = await t.withIdentity({ subject: "clerk|a" }).query(internal.items.list, {});
    expect(items).toHaveLength(1);
  });

  test("never shows the public showroom's episodes", async () => {
    const t = testConvex();
    await t.mutation(internal.feeds.seedSampleFeed, { urls: [YOUTUBE_URL] });
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { clerkId: "clerk|a", feedToken: "t", createdAt: 0 });
    });

    const items = await t.withIdentity({ subject: "clerk|a" }).query(internal.items.list, {});
    expect(items).toEqual([]);
  });
});

describe("permanent feeds", () => {
  async function readyItemIn(t: ReturnType<typeof testConvex>, permanent: boolean) {
    const itemId = await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", {
        feedToken: permanent ? "public" : "private",
        slug: permanent ? "sample" : undefined,
        permanent: permanent ? true : undefined,
        createdAt: 0,
      });
      return await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "extracting",
      });
    });
    await t.mutation(internal.items.markReady, { itemId, r2Key: `items/${itemId}.mp3` });
    return await t.run(async (ctx) => ctx.db.get(itemId));
  }

  // Nothing else deletes ready audio, so "no expiresAt" is the whole mechanism
  // keeping the showroom's enclosures alive.
  test("never give the showroom's episodes a deadline", async () => {
    const item = await readyItemIn(testConvex(), true);
    expect(item!.status).toBe("ready");
    expect(item!.expiresAt).toBeUndefined();
  });

  test("a normal feed's episodes still expire", async () => {
    const item = await readyItemIn(testConvex(), false);
    expect(item!.expiresAt).toBeGreaterThan(Date.now());
  });
});

describe("stripping the superseded columns", () => {
  test("clears items.userId and users.feedToken, and is idempotent", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "t", createdAt: 0 });
      const userId = await ctx.db.insert("users", {
        clerkId: "clerk|a",
        feedId,
        feedToken: "t",
        createdAt: 0,
      });
      await ctx.db.insert("items", {
        feedId,
        userId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "ready",
      });
    });

    const first = await t.mutation(internal.feeds.stripLegacyColumns, {});
    expect(first).toEqual({ itemsStripped: 1, usersStripped: 1, done: true });

    const state = await t.run(async (ctx) => {
      const user = (await ctx.db.query("users").collect())[0];
      const item = (await ctx.db.query("items").collect())[0];
      return {
        userHasToken: user.feedToken !== undefined,
        itemHasUserId: item.userId !== undefined,
        // The feed keeps the token; only the duplicate copy goes.
        feedToken: (await ctx.db.get(user.feedId!))!.feedToken,
      };
    });
    expect(state).toEqual({ userHasToken: false, itemHasUserId: false, feedToken: "t" });

    expect(await t.mutation(internal.feeds.stripLegacyColumns, {})).toEqual({
      itemsStripped: 0,
      usersStripped: 0,
      done: true,
    });
  });

  test("leaves the feed reachable at the same URL afterwards", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "keep-me", createdAt: 0 });
      await ctx.db.insert("users", {
        clerkId: "clerk|a",
        feedId,
        feedToken: "keep-me",
        createdAt: 0,
      });
    });

    await t.mutation(internal.feeds.stripLegacyColumns, {});

    // The whole point: stripping the duplicate must not change anyone's URL.
    const found = await t.query(internal.items.feedForRequest, { tokenOrSlug: "keep-me" });
    expect(found).not.toBeNull();
  });
});
