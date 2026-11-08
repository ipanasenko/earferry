import { describe, expect, test } from "bun:test";
import { internal } from "../convex/_generated/api";
import { describeFailure, MAX_AUTO_RETRIES } from "../convex/domain";
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
    expect(item?.error).toBe("YouTube kept refusing the download. Retry in a little while");
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
    expect(item?.error).toBe("We couldn't extract this video. Retry in a little while");
    expect(item?.error).not.toContain("yt-dlp");
  });
});

describe("describeFailure", () => {
  test("treats a probe with no playable formats as YouTube refusing access", () => {
    expect(describeFailure("yt-dlp returned probe metadata with no playable formats")).toEqual({
      permanent: false,
      message: "YouTube kept refusing the download. Retry in a little while",
    });
  });

  test("keeps the extractor's access-block message as an access block", () => {
    const failure = describeFailure(
      "YouTube is refusing downloads right now. Trying again shortly: ERROR: HTTP Error 403",
    );
    expect(failure.message).toBe("YouTube kept refusing the download. Retry in a little while");
  });

  test("rewords messages stored before the rewording", () => {
    expect(
      describeFailure("YouTube is refusing downloads right now. Trying again shortly").message,
    ).toBe("YouTube kept refusing the download. Retry in a little while");
    expect(
      describeFailure("We couldn't finish extracting this video. Trying again shortly").message,
    ).toBe("We couldn't extract this video. Retry in a little while");
    expect(
      describeFailure("We couldn't finish narrating this article. Trying again shortly", "article")
        .message,
    ).toBe("We couldn't narrate this article. Retry in a little while");
  });

  test("never promises another automatic attempt", () => {
    for (const detail of ["", "boom", "sign in to confirm you're not a bot", "Video unavailable"]) {
      expect(describeFailure(detail).message).not.toMatch(/trying again/i);
      expect(describeFailure(detail, "article").message).not.toMatch(/trying again/i);
    }
  });
});
