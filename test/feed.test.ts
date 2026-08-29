import { describe, expect, test } from "bun:test";
import type { Doc } from "../convex/_generated/dataModel";
import { buildFeed } from "../convex/feed";

const privateFeed = { feedToken: "feed-token" };

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

    const feed = await buildFeed([item], "https://earferry.example", privateFeed);

    expect(feed).toContain(`<pubDate>${new Date(addedAt).toUTCString()}</pubDate>`);
    expect(feed).not.toContain(`<pubDate>${new Date(publishedAt).toUTCString()}</pubDate>`);
  });

  test("includes the user's name in the feed title and author", async () => {
    const feed = await buildFeed([], "https://earferry.example", privateFeed, "Ava & Sam");

    expect(feed).toContain("<title>EarFerry · Captained by Ava &amp; Sam</title>");
    expect(feed).toContain("<itunes:author>EarFerry · Captained by Ava &amp; Sam</itunes:author>");
  });

  test("a public feed publishes its slug and its own branding", async () => {
    const feed = await buildFeed([], "https://earferry.example", {
      feedToken: "secret-token",
      slug: "sample",
      title: "EarFerry · Sample Crossings",
      description: "Original demo episodes.",
    });

    expect(feed).toContain("<title>EarFerry · Sample Crossings</title>");
    expect(feed).toContain("<description>Original demo episodes.</description>");
    expect(feed).toContain('href="https://earferry.example/feed/sample"');
    // The self-link is the slug, so a public feed never advertises its token.
    expect(feed).not.toContain("secret-token");
  });

  test("a public feed still signs enclosures with its token", async () => {
    process.env.INTERNAL_SECRET = "test-secret";
    process.env.MEDIA_BASE_URL = "https://media.example";
    const item = {
      _id: "item-id",
      _creationTime: 0,
      videoId: "abcdefghijk",
      title: "Demo",
      addedAt: 0,
      position: 1,
      status: "ready",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", {
      feedToken: "secret-token",
      slug: "sample",
    });

    // Enclosure URLs carry the token by design, so a public feed's token is
    // readable by any subscriber. That is why a public feed has no owner and
    // holds nothing private.
    expect(feed).toContain("/media/secret-token/item-id.mp3");
  });
});
