import { describe, expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { testConvex } from "./convexTest";

const YOUTUBE_URL = "https://www.youtube.com/watch?v=abcdefghijk";

describe("the queue a signed-in person sees", () => {
  test("shows the items in their own feed", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "t", createdAt: 0 });
      await ctx.db.insert("users", { clerkId: "clerk|a", feedId, createdAt: 0 });
      await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "ready",
      });
    });

    const items = await t.withIdentity({ subject: "clerk|a" }).query(internal.items.list, {});
    expect(items).toHaveLength(1);
  });

  test("never shows the public showroom's episodes", async () => {
    const t = testConvex();
    await t.mutation(internal.feeds.seedSampleFeed, { urls: [YOUTUBE_URL] });
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "t", createdAt: 0 });
      await ctx.db.insert("users", { clerkId: "clerk|a", feedId, createdAt: 0 });
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
