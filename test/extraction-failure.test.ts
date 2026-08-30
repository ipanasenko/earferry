import { describe, expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { MAX_AUTO_RETRIES } from "../convex/domain";
import { testConvex } from "./convexTest";

const YOUTUBE_URL = "https://www.youtube.com/watch?v=abcdefghijk";

describe("extraction failure messages", () => {
  test("does not expose extractor diagnostics in the queue error", async () => {
    const t = testConvex();
    const itemId = await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
      return await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "probing",
        attempts: MAX_AUTO_RETRIES,
      });
    });

    await t.mutation(internal.items.retryOrFail, {
      itemId,
      detail: "yt-dlp returned probe metadata with no playable formats",
      retryable: true,
    });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.status).toBe("failed");
    expect(item?.error).toBe("We couldn't finish extracting this video. Trying again shortly");
    expect(item?.error).not.toContain("yt-dlp");
  });

  test("normalizes diagnostics already stored on failed queue items", async () => {
    const t = testConvex();
    const clerkId = "clerk|a";
    await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
      await ctx.db.insert("users", { clerkId, feedId, createdAt: 0 });
      await ctx.db.insert("items", {
        feedId,
        url: YOUTUBE_URL,
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "failed",
        error: "Extraction did not finish. Trying again shortly: yt-dlp returned invalid metadata",
      });
    });

    const [item] = await t.withIdentity({ subject: clerkId }).query(internal.items.list, {});
    expect(item?.error).toBe("We couldn't finish extracting this video. Trying again shortly");
    expect(item?.error).not.toContain("yt-dlp");
  });
});
