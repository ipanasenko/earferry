import { describe, expect, test } from "bun:test";
import type { Doc } from "../convex/_generated/dataModel";
import { buildFeed } from "../convex/feed";

const privateFeed = { feedToken: "feed-token" };

describe("podcast feed", () => {
  test("falls back to the added time for legacy episodes", async () => {
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

  test("publishes a delayed episode when it became ready", async () => {
    const addedAt = Date.parse("2026-08-30T16:45:14Z");
    const readyAt = Date.parse("2026-08-31T15:05:00Z");
    const item = {
      _id: "delayed-item-id",
      _creationTime: addedAt,
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      videoId: "abcdefghijk",
      title: "Delayed video",
      addedAt,
      readyAt,
      position: 1,
      status: "ready",
      mediaUrl: "https://media.example/delayed-item.mp3",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", privateFeed);

    expect(feed).toContain(`<pubDate>${new Date(readyAt).toUTCString()}</pubDate>`);
    expect(feed).not.toContain(`<pubDate>${new Date(addedAt).toUTCString()}</pubDate>`);
  });

  test("includes the user's name in the feed title and author", async () => {
    const feed = await buildFeed([], "https://earferry.example", privateFeed, "Ava & Sam");

    expect(feed).toContain("<title>EarFerry · Captained by Ava &amp; Sam</title>");
    expect(feed).toContain("<itunes:author>EarFerry · Captained by Ava &amp; Sam</itunes:author>");
  });

  test("an episode's author is its channel or site name", async () => {
    const item = {
      _id: "item-id",
      _creationTime: 0,
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      videoId: "abcdefghijk",
      title: "Saved video",
      channel: "Kult: Podcast <& Friends>",
      addedAt: 0,
      position: 1,
      status: "ready",
      mediaUrl: "https://media.example/item.mp3",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", privateFeed, "Ava & Sam");

    expect(feed).toContain("<itunes:author>Kult: Podcast &lt;&amp; Friends&gt;</itunes:author>");
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

describe("kept video", () => {
  const baseItem = {
    _id: "video-item-id",
    _creationTime: 0,
    url: "https://www.youtube.com/watch?v=abcdefghijk",
    videoId: "abcdefghijk",
    title: "Kept video",
    addedAt: 0,
    position: 1,
    status: "ready",
    sizeBytes: 1_000,
    mediaUrl: "https://media.example/video-item-id.mp3?s=sig",
  };

  test("publishes the MP4 as the enclosure and the MP3 as an alternate", async () => {
    const item = {
      ...baseItem,
      videoR2Key: "items/video-item-id.mp4",
      videoSizeBytes: 50_000,
      videoUrl: "https://media.example/video-item-id.mp4?s=sig",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", privateFeed);

    expect(feed).toContain('xmlns:podcast="https://podcastindex.org/namespace/1.0"');
    expect(feed).toContain(
      '<enclosure url="https://media.example/video-item-id.mp4?s=sig" length="50000" type="video/mp4" />',
    );
    expect(feed).toContain(
      '<podcast:alternateEnclosure type="audio/mpeg" length="1000" default="false" title="Audio">',
    );
    expect(feed).toContain(
      '<podcast:source uri="https://media.example/video-item-id.mp3?s=sig" />',
    );
    expect(feed).not.toContain('type="audio/mpeg" />');
  });

  test("a video past its deadline falls back to the audio enclosure", async () => {
    const item = {
      ...baseItem,
      videoR2Key: "items/video-item-id.mp4",
      videoSizeBytes: 50_000,
      videoUrl: "https://media.example/video-item-id.mp4?s=sig",
      videoExpiresAt: Date.now() - 1,
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", privateFeed);

    expect(feed).not.toContain('type="video/mp4"');
    expect(feed).not.toContain("alternateEnclosure");
    expect(feed).toContain(
      '<enclosure url="https://media.example/video-item-id.mp3?s=sig" length="1000" type="audio/mpeg" />',
    );
  });

  test("an audio-only item keeps the plain audio enclosure", async () => {
    const item = baseItem as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", privateFeed);

    expect(feed).toContain(
      '<enclosure url="https://media.example/video-item-id.mp3?s=sig" length="1000" type="audio/mpeg" />',
    );
    expect(feed).not.toContain("podcast:alternateEnclosure");
    expect(feed).not.toContain("video/mp4");
  });
});

describe("article chapters", () => {
  const articleItem = (chapters?: Array<{ title: string; startSeconds: number }>) =>
    ({
      _id: "article-item-id",
      _creationTime: Date.parse("2026-09-01T10:00:00Z"),
      url: "https://blog.example/posts/ears",
      videoId: "a:hash",
      kind: "article",
      title: "How Ferries Carry Ears",
      addedAt: Date.parse("2026-09-01T10:00:00Z"),
      position: 1,
      status: "ready",
      mediaUrl: "https://media.example/article.mp3",
      chapters,
    }) as unknown as Doc<"items">;

  test("renders stored section chapters as PSC chapters", async () => {
    const feed = await buildFeed(
      [
        articleItem([
          { title: "How Ferries Carry Ears", startSeconds: 0 },
          { title: "Second Thoughts <& more>", startSeconds: 754.2 },
          { title: "Closing", startSeconds: 3725 },
        ]),
      ],
      "https://earferry.example",
      privateFeed,
    );

    expect(feed).toContain('<psc:chapter start="0:00" title="How Ferries Carry Ears" />');
    expect(feed).toContain(
      '<psc:chapter start="12:34" title="Second Thoughts &lt;&amp; more&gt;" />',
    );
    expect(feed).toContain('<psc:chapter start="1:02:05" title="Closing" />');
  });

  test("emits no chapters for an article without sections", async () => {
    const feed = await buildFeed([articleItem()], "https://earferry.example", privateFeed);
    expect(feed).not.toContain("psc:chapter ");
  });
});
