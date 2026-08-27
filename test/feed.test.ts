import { describe, expect, test } from "bun:test";
import type { Doc } from "../convex/_generated/dataModel";
import { buildFeed } from "../convex/feed";

describe("podcast feed", () => {
  test("publishes an episode at the time it was added to the playlist", async () => {
    const addedAt = Date.parse("2026-08-27T09:30:00Z");
    const publishedAt = Date.parse("2020-01-02T03:04:05Z");
    const item = {
      _id: "item-id",
      _creationTime: addedAt,
      userId: "user-id",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      videoId: "abcdefghijk",
      title: "Saved video",
      publishedAt,
      addedAt,
      position: 1,
      status: "ready",
      mediaUrl: "https://media.example/item.mp3",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", "feed-token");

    expect(feed).toContain(`<pubDate>${new Date(addedAt).toUTCString()}</pubDate>`);
    expect(feed).not.toContain(`<pubDate>${new Date(publishedAt).toUTCString()}</pubDate>`);
  });
});
