import { describe, expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { testConvex } from "./convexTest";

const YOUTUBE_URL = "https://www.youtube.com/watch?v=abcdefghijk";

describe("waiting item ordering", () => {
  test("shows waiting items before the rest of the playlist", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
      await ctx.db.insert("users", { clerkId: "clerk|a", feedId, createdAt: 0 });
      await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "waiting-item",
        addedAt: 0,
        position: 1,
        status: "waiting",
      });
      await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "extracting-item",
        addedAt: 0,
        position: 2,
        status: "extracting",
      });
      await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "ready-item",
        addedAt: 0,
        position: 3,
        status: "ready",
      });
    });

    const items = await t.withIdentity({ subject: "clerk|a" }).query(internal.items.list, {});

    expect(items.map((item) => item.videoId)).toEqual([
      "waiting-item",
      "ready-item",
      "extracting-item",
    ]);
  });

  test("shows failed items below waiting items and above the rest", async () => {
    const t = testConvex();
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
      await ctx.db.insert("users", { clerkId: "clerk|a", feedId, createdAt: 0 });
      const rows = [
        { videoId: "old-failed", position: 1, status: "failed" as const },
        { videoId: "waiting-item", position: 2, status: "waiting" as const },
        { videoId: "new-failed", position: 3, status: "failed" as const },
        { videoId: "ready-item", position: 4, status: "ready" as const },
        { videoId: "extracting-item", position: 5, status: "extracting" as const },
      ];
      for (const row of rows) {
        await ctx.db.insert("items", { feedId, url: YOUTUBE_URL, addedAt: 0, ...row });
      }
    });

    const items = await t.withIdentity({ subject: "clerk|a" }).query(internal.items.list, {});

    expect(items.map((item) => item.videoId)).toEqual([
      "waiting-item",
      "new-failed",
      "old-failed",
      "extracting-item",
      "ready-item",
    ]);
  });

  test("puts a newly ready item at the top of the podcast feed", async () => {
    const t = testConvex();
    const waitingItemId = await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
      const waitingItemId = await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "waiting-item",
        addedAt: 0,
        position: 1,
        status: "extracting",
      });
      await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "ready-item",
        addedAt: 0,
        position: 2,
        status: "ready",
      });
      return waitingItemId;
    });

    await t.mutation(internal.items.markReady, {
      itemId: waitingItemId,
      r2Key: `items/${waitingItemId}.mp3`,
    });

    const feed = await t.query(internal.items.feedForRequest, { tokenOrSlug: "token" });
    expect(feed!.items.map((item) => item.videoId)).toEqual(["waiting-item", "ready-item"]);
  });
});
