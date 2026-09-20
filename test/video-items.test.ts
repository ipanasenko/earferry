import { describe, expect, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { testConvex } from "./convexTest";

const VIDEO_URL = "https://www.youtube.com/watch?v=abcdefghijk";
const ARTICLE_URL = "https://example.com/story/why-ferries";

describe("keeping the video", () => {
  test("items.add stores the flag for a YouTube link only", async () => {
    const t = testConvex();
    const asUser = t.withIdentity({ subject: "clerk|video" });

    const videoItemId = await asUser.mutation(api.items.add, { url: VIDEO_URL, video: true });
    const articleItemId = await asUser.mutation(api.items.add, { url: ARTICLE_URL, video: true });
    const audioOnlyId = await asUser.mutation(api.items.add, {
      url: "https://youtu.be/zyxwvutsrqp",
    });

    const [videoItem, articleItem, audioOnly] = await t.run(async (ctx) =>
      Promise.all([ctx.db.get(videoItemId), ctx.db.get(articleItemId), ctx.db.get(audioOnlyId)]),
    );
    expect(videoItem?.video).toBe(true);
    // Articles are narrated, so there is no video to keep.
    expect(articleItem?.video).toBeUndefined();
    expect(audioOnly?.video).toBeUndefined();
  });

  test("markReady stores the video fields and list exposes them", async () => {
    const t = testConvex();
    const asUser = t.withIdentity({ subject: "clerk|video" });
    const itemId = await asUser.mutation(api.items.add, { url: VIDEO_URL, video: true });
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

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.status).toBe("ready");
    expect(item?.videoR2Key).toBe(`items/${itemId}.mp4`);
    expect(item?.videoSizeBytes).toBe(50_000);
    expect(item?.videoUrl).toBe("https://media.example/item.mp4?s=sig");

    const listed = await asUser.query(api.items.list, {});
    expect(listed[0]?.video).toBe(true);
    expect(listed[0]?.videoUrl).toBe("https://media.example/item.mp4?s=sig");
  });

  test("a re-added failed item drops stale video media and takes the new choice", async () => {
    const t = testConvex();
    const asUser = t.withIdentity({ subject: "clerk|video" });
    const itemId = await asUser.mutation(api.items.add, { url: VIDEO_URL, video: true });
    await t.run(async (ctx) =>
      ctx.db.patch(itemId, {
        status: "failed",
        videoR2Key: `items/${itemId}.mp4`,
        videoSizeBytes: 1,
        videoUrl: "https://media.example/stale.mp4",
      }),
    );

    await asUser.mutation(api.items.add, { url: VIDEO_URL });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.status).toBe("queued");
    expect(item?.video).toBeUndefined();
    expect(item?.videoR2Key).toBeUndefined();
    expect(item?.videoSizeBytes).toBeUndefined();
    expect(item?.videoUrl).toBeUndefined();
  });
});
