import { describe, expect, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { testConvex } from "./convexTest";

const VIDEO_URL = "https://www.youtube.com/watch?v=abcdefghijk";
const WEEK_MS = 7 * 24 * 60 * 60 * 1_000;

async function readyWithVideo(t: ReturnType<typeof testConvex>) {
  const asUser = t.withIdentity({ subject: "clerk|video" });
  const itemId = await asUser.mutation(api.items.add, { url: VIDEO_URL });
  await t.run(async (ctx) =>
    ctx.db.patch(itemId, { status: "extracting", attemptToken: "attempt-1" }),
  );
  const published = await t.mutation(internal.items.markReady, {
    itemId,
    attempt: "attempt-1",
    r2Key: `items/${itemId}.mp3`,
    sizeBytes: 1_000,
    mediaUrl: "https://media.example/item.mp3?s=sig",
    videoR2Key: `items/${itemId}.mp4`,
    videoSizeBytes: 50_000,
    videoUrl: "https://media.example/item.mp4?s=sig",
  });
  expect(published).toBe(true);
  return { asUser, itemId };
}

describe("kept video", () => {
  test("markReady stores the video with a one-week deadline and list exposes it", async () => {
    const t = testConvex();
    const before = Date.now();
    const { asUser, itemId } = await readyWithVideo(t);

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.status).toBe("ready");
    expect(item?.videoR2Key).toBe(`items/${itemId}.mp4`);
    expect(item?.videoSizeBytes).toBe(50_000);
    expect(item?.videoUrl).toBe("https://media.example/item.mp4?s=sig");
    expect(item?.videoExpiresAt).toBeGreaterThanOrEqual(before + WEEK_MS);
    // The audio keeps its own, longer deadline.
    expect(item?.expiresAt).toBeGreaterThan(item?.videoExpiresAt ?? Infinity);

    const listed = await asUser.query(api.items.list, {});
    expect(listed[0]?.videoUrl).toBe("https://media.example/item.mp4?s=sig");
  });

  test("an audio-only completion leaves no video deadline", async () => {
    const t = testConvex();
    const asUser = t.withIdentity({ subject: "clerk|video" });
    const itemId = await asUser.mutation(api.items.add, { url: VIDEO_URL });
    await t.run(async (ctx) =>
      ctx.db.patch(itemId, { status: "extracting", attemptToken: "attempt-1" }),
    );
    await t.mutation(internal.items.markReady, {
      itemId,
      attempt: "attempt-1",
      r2Key: `items/${itemId}.mp3`,
      sizeBytes: 1_000,
    });
    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.videoR2Key).toBeUndefined();
    expect(item?.videoExpiresAt).toBeUndefined();
  });

  test("clearExpiredVideo drops the video fields and keeps the episode", async () => {
    const t = testConvex();
    const { itemId } = await readyWithVideo(t);
    const item = await t.run(async (ctx) => ctx.db.get(itemId));

    // A stale observation must not clear a fresher deadline.
    expect(
      await t.mutation(internal.items.clearExpiredVideo, {
        itemId,
        observedVideoExpiresAt: (item?.videoExpiresAt ?? 0) - 1,
      }),
    ).toBe(false);

    expect(
      await t.mutation(internal.items.clearExpiredVideo, {
        itemId,
        observedVideoExpiresAt: item?.videoExpiresAt ?? 0,
      }),
    ).toBe(true);
    const cleared = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(cleared?.status).toBe("ready");
    expect(cleared?.mediaUrl).toBe("https://media.example/item.mp3?s=sig");
    expect(cleared?.videoR2Key).toBeUndefined();
    expect(cleared?.videoUrl).toBeUndefined();
    expect(cleared?.videoExpiresAt).toBeUndefined();
  });

  test("expiredVideos lists only videos past their deadline", async () => {
    const t = testConvex();
    const { itemId } = await readyWithVideo(t);
    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    const deadline = item?.videoExpiresAt ?? 0;
    expect(await t.query(internal.items.expiredVideos, { now: deadline - 1 })).toHaveLength(0);
    expect(await t.query(internal.items.expiredVideos, { now: deadline })).toHaveLength(1);
  });

  test("a re-added failed item drops stale video media", async () => {
    const t = testConvex();
    const asUser = t.withIdentity({ subject: "clerk|video" });
    const itemId = await asUser.mutation(api.items.add, { url: VIDEO_URL });
    await t.run(async (ctx) =>
      ctx.db.patch(itemId, {
        status: "failed",
        videoR2Key: `items/${itemId}.mp4`,
        videoSizeBytes: 1,
        videoUrl: "https://media.example/stale.mp4",
        videoExpiresAt: Date.now() + WEEK_MS,
      }),
    );

    await asUser.mutation(api.items.add, { url: VIDEO_URL });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.status).toBe("queued");
    expect(item?.videoR2Key).toBeUndefined();
    expect(item?.videoUrl).toBeUndefined();
    expect(item?.videoExpiresAt).toBeUndefined();
  });
});
