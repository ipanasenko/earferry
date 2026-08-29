import { describe, expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { testConvex } from "./convexTest";

describe("feed resolution", () => {
  // The invariant that replaces the #39 fallback: a user cannot exist without
  // a feed, because the same mutation creates both. Nothing has to repair the
  // gap afterwards, so there is no gap.
  test("a newly created user is immediately resolvable by their feed token", async () => {
    const t = testConvex();
    await t.withIdentity({ subject: "clerk|new" }).mutation(internal.users.syncProfile, {
      displayName: "Ava",
    });

    const feedToken = await t.run(async (ctx) => {
      const user = (await ctx.db.query("users").collect())[0];
      expect(user.feedId).toBeDefined();
      return (await ctx.db.get(user.feedId!))!.feedToken;
    });
    const found = await t.query(internal.items.feedForRequest, { tokenOrSlug: feedToken });

    expect(found).not.toBeNull();
    expect(found!.owner?.displayName).toBe("Ava");
  });

  test("resolves a migrated user by their feed token", async () => {
    const t = testConvex();
    const feedToken = "migrated-token";
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken, createdAt: 0 });
      const userId = await ctx.db.insert("users", {
        clerkId: "clerk|migrated",
        feedId,
        feedToken,
        createdAt: 0,
      });
      await ctx.db.insert("items", {
        feedId,
        userId,
        url: "https://www.youtube.com/watch?v=abcdefghijk",
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "ready",
        expiresAt: Date.now() + 60_000,
      });
    });

    const found = await t.query(internal.items.feedForRequest, { tokenOrSlug: feedToken });

    expect(found!.items).toHaveLength(1);
    expect(found!.feed.slug).toBeUndefined();
  });

  test("resolves the public showroom by slug, and it has no owner", async () => {
    const t = testConvex();
    await t.mutation(internal.feeds.ensureSampleFeed, {});

    const found = await t.query(internal.items.feedForRequest, { tokenOrSlug: "sample" });

    expect(found!.feed.slug).toBe("sample");
    expect(found!.feed.title).toBe("EarFerry · Sample Crossings");
    expect(found!.owner).toBeNull();
  });

  test("an unknown token or slug resolves to nothing", async () => {
    const t = testConvex();
    expect(await t.query(internal.items.feedForRequest, { tokenOrSlug: "nope" })).toBeNull();
  });

  // Only ready, unexpired episodes are playable, so nothing else belongs in a feed.
  test("leaves out episodes that are not ready or have expired", async () => {
    const t = testConvex();
    const feedToken = "filter-token";
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken, createdAt: 0 });
      await ctx.db.insert("users", {
        clerkId: "clerk|filter",
        feedId,
        feedToken,
        createdAt: 0,
      });
      const base = {
        feedId,
        url: "https://www.youtube.com/watch?v=abcdefghijk",
        addedAt: 0,
        position: 1,
      };
      await ctx.db.insert("items", { ...base, videoId: "a", status: "queued" });
      await ctx.db.insert("items", { ...base, videoId: "b", status: "failed" });
      await ctx.db.insert("items", { ...base, videoId: "c", status: "ready", expiresAt: 1 });
      await ctx.db.insert("items", {
        ...base,
        videoId: "d",
        status: "ready",
        expiresAt: Date.now() + 60_000,
      });
    });

    const found = await t.query(internal.items.feedForRequest, { tokenOrSlug: feedToken });

    expect(found!.items.map((item) => item.videoId)).toEqual(["d"]);
  });
});
