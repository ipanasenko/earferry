import { describe, expect, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import type { Doc } from "../convex/_generated/dataModel";
import { classifyUrl, sha256Hex } from "../convex/domain";
import { buildFeed } from "../convex/feed";
import { testConvex } from "./convexTest";

const ARTICLE_URL = "https://example.com/story/why-ferries";

describe("classifyUrl", () => {
  test("keeps the YouTube lane exactly as before", () => {
    const result = classifyUrl("https://youtu.be/abcdefghijk");
    expect(result).toEqual({
      kind: "video",
      canonicalUrl: "https://www.youtube.com/watch?v=abcdefghijk",
      dedupeKey: "abcdefghijk",
    });
  });

  test("classifies an https non-YouTube link as an article", () => {
    const result = classifyUrl(ARTICLE_URL);
    expect(result.kind).toBe("article");
    expect(result.canonicalUrl).toBe(ARTICLE_URL);
    expect(result.dedupeKey).toMatch(/^a:[0-9a-f]{32}$/);
    expect(result.dedupeKey).toBe(`a:${sha256Hex(ARTICLE_URL).slice(0, 32)}`);
  });

  test("strips fragments and tracking params before hashing", () => {
    const clean = classifyUrl(ARTICLE_URL);
    const tracked = classifyUrl(
      `${ARTICLE_URL}?utm_source=x&utm_medium=y&fbclid=abc&gclid=def#section-2`,
    );
    expect(tracked.canonicalUrl).toBe(clean.canonicalUrl);
    expect(tracked.dedupeKey).toBe(clean.dedupeKey);
    // A meaningful query param survives and changes the key.
    expect(classifyUrl(`${ARTICLE_URL}?page=2`).dedupeKey).not.toBe(clean.dedupeKey);
  });

  test("refuses junk that is neither video nor article", () => {
    for (const bad of [
      "not a url",
      "http://example.com/insecure",
      "https://localhost/post",
      "ftp://example.com/file",
      42,
    ]) {
      expect(() => classifyUrl(bad)).toThrow("Enter a valid https link to a video or article.");
    }
  });

  test("still rejects a broken YouTube link with the YouTube wording", () => {
    expect(() => classifyUrl("https://www.youtube.com/playlist?list=abc")).toThrow(
      "Enter a link to a single YouTube video.",
    );
  });
});

describe("sha256Hex", () => {
  test("matches the known SHA-256 test vector", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});

describe("adding articles", () => {
  test("the same article with different tracking params dedupes to one item", async () => {
    const t = testConvex();
    const asUser = t.withIdentity({ subject: "clerk|a" });
    const first = await asUser.mutation(api.items.add, {
      url: `${ARTICLE_URL}?utm_source=newsletter`,
    });
    const second = await asUser.mutation(api.items.add, { url: `${ARTICLE_URL}?utm_source=rss` });
    expect(second).toBe(first);

    const items = await asUser.query(api.items.list, {});
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe("article");
    expect(items[0].url).toBe(ARTICLE_URL);
    expect(items[0].videoId).toMatch(/^a:[0-9a-f]{32}$/);
  });
});

async function insertArticle(t: ReturnType<typeof testConvex>, patch: Partial<Doc<"items">> = {}) {
  return await t.run(async (ctx) => {
    const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
    return await ctx.db.insert("items", {
      feedId,
      url: ARTICLE_URL,
      videoId: `a:${sha256Hex(ARTICLE_URL).slice(0, 32)}`,
      kind: "article",
      addedAt: 0,
      position: 1,
      status: "queued",
      ...patch,
    });
  });
}

describe("article probe metadata", () => {
  test("recordProbe stores the article-shaped probe payload", async () => {
    const t = testConvex();
    const itemId = await insertArticle(t);

    // The extractor answers /probe for articles with yt-dlp-shaped JSON where
    // thumbnail carries the og:image; extractor.run maps it to these args.
    await t.mutation(internal.items.recordProbe, {
      itemId,
      title: "Why ferries",
      channel: "Example Magazine",
      description: "A long read about ferries.",
      durationSeconds: 1080,
      artworkUrl: "https://example.com/og-image.jpg",
    });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.title).toBe("Why ferries");
    expect(item?.channel).toBe("Example Magazine");
    expect(item?.durationSeconds).toBe(1080);
    expect(item?.artworkUrl).toBe("https://example.com/og-image.jpg");
    expect(item?.kind).toBe("article");
  });
});

describe("article failure wording", () => {
  test("a paywalled article fails with the subscriber-only message", async () => {
    const t = testConvex();
    const itemId = await insertArticle(t, { status: "probing" });

    await t.mutation(internal.items.retryOrFail, {
      itemId,
      detail: "reader: page is behind a paywall",
      retryable: false,
    });

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.status).toBe("failed");
    expect(item?.error).toBe("This article is subscriber-only or couldn't be read.");
  });
});

describe("article heartbeat wording", () => {
  test("the downloading and synthesizing phases read as article work", async () => {
    const t = testConvex();
    process.env.INTERNAL_SECRET = "test-secret";
    const itemId = await insertArticle(t, {
      status: "extracting",
      attemptToken: "attempt-1",
      lastHeartbeatAt: 0,
    });

    const response = await t.fetch("/internal/extract-heartbeat", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
      body: JSON.stringify({ itemId, phase: "downloading", attempt: "attempt-1" }),
    });
    expect(response.status).toBe(200);

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.phase).toBe("Fetching the article");

    const synthResponse = await t.fetch("/internal/extract-heartbeat", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
      body: JSON.stringify({ itemId, phase: "synthesizing", attempt: "attempt-1" }),
    });
    expect(synthResponse.status).toBe(200);

    const narrating = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(narrating?.phase).toBe("Turning the article into audio");
    expect(narrating?.status).toBe("extracting");
  });

  test("a video keeps the downloading wording", async () => {
    const t = testConvex();
    process.env.INTERNAL_SECRET = "test-secret";
    const itemId = await t.run(async (ctx) => {
      const feedId = await ctx.db.insert("feeds", { feedToken: "token", createdAt: 0 });
      return await ctx.db.insert("items", {
        feedId,
        url: "https://www.youtube.com/watch?v=abcdefghijk",
        videoId: "abcdefghijk",
        addedAt: 0,
        position: 1,
        status: "extracting",
        attemptToken: "attempt-1",
        lastHeartbeatAt: 0,
      });
    });

    const response = await t.fetch("/internal/extract-heartbeat", {
      method: "POST",
      headers: { authorization: "Bearer test-secret", "content-type": "application/json" },
      body: JSON.stringify({ itemId, phase: "downloading", attempt: "attempt-1" }),
    });
    expect(response.status).toBe(200);

    const item = await t.run(async (ctx) => ctx.db.get(itemId));
    expect(item?.phase).toBe("Downloading and converting audio");
  });
});

describe("article feed entries", () => {
  test("an article episode publishes article-flavored strings", async () => {
    const item = {
      _id: "article-item-id",
      _creationTime: 0,
      url: ARTICLE_URL,
      videoId: `a:${sha256Hex(ARTICLE_URL).slice(0, 32)}`,
      kind: "article",
      addedAt: 0,
      position: 1,
      status: "ready",
      mediaUrl: "https://media.example/article-item.mp3",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", { feedToken: "feed-token" });

    expect(feed).toContain("<title>Article audio</title>");
    expect(feed).toContain(`Original article: ${ARTICLE_URL}`);
    expect(feed).not.toContain("Original video:");
    expect(feed).not.toContain("YouTube audio");
  });

  test("a video episode keeps the YouTube strings", async () => {
    const item = {
      _id: "video-item-id",
      _creationTime: 0,
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      videoId: "abcdefghijk",
      addedAt: 0,
      position: 1,
      status: "ready",
      mediaUrl: "https://media.example/video-item.mp3",
    } as unknown as Doc<"items">;

    const feed = await buildFeed([item], "https://earferry.example", { feedToken: "feed-token" });

    expect(feed).toContain("<title>YouTube audio</title>");
    expect(feed).toContain("Original video: https://www.youtube.com/watch?v=abcdefghijk");
  });
});
