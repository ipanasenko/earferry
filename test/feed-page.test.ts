import { describe, expect, test } from "bun:test";
import type { Doc } from "../convex/_generated/dataModel";
import { buildFeedPage, wantsFeedPage } from "../convex/feedPage";
import { feedRequestHeaders } from "../worker";
import { testConvex } from "./convexTest";

const browserHeaders = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "sec-fetch-dest": "document",
};
const feed = { feedToken: "private-token" };

describe("browser feed", () => {
  test("serves HTML only for browser navigation, with an explicit RSS override", () => {
    expect(
      wantsFeedPage(new Request("https://example.com/feed/token", { headers: browserHeaders })),
    ).toBe(true);
    for (const headers of [
      {},
      { accept: "*/*" },
      { accept: "text/html" },
      { ...browserHeaders, accept: "text/html;q=0" },
    ]) {
      expect(wantsFeedPage(new Request("https://example.com/feed/token", { headers }))).toBe(false);
    }
    expect(
      wantsFeedPage(
        new Request("https://example.com/feed/token?format=rss", { headers: browserHeaders }),
      ),
    ).toBe(false);
    expect(
      feedRequestHeaders(
        new Request("https://example.com/feed/token", { headers: browserHeaders }),
      ).get("sec-fetch-dest"),
    ).toBe("document");
  });

  test("escapes source content and plays audio alongside unexpired video", async () => {
    const item = {
      _id: "episode",
      title: '<script>alert("title")</script>',
      channel: "Channel & friends",
      description: '<img src=x onerror="alert(1)">',
      url: "javascript:alert(1)",
      mediaUrl: "https://media.example/episode.mp3?s=abc&v=1",
      videoUrl: "https://media.example/episode.mp4",
      videoExpiresAt: Date.now() + 60_000,
      addedAt: 0,
    } as unknown as Doc<"items">;
    const page = await buildFeedPage([item], "https://example.com", feed, "Ava");
    expect(page).toContain("Channel &amp; friends");
    expect(page).toContain("&lt;script&gt;");
    expect(page).not.toContain("<script>");
    expect(page).not.toContain("javascript:");
    expect(page).toContain(
      '<audio controls preload="none" src="https://media.example/episode.mp3?s=abc&amp;v=1"',
    );
    expect(page).toContain('<video controls preload="none"');
    expect(page).toContain("private-token?format=rss");
    const expired = await buildFeedPage(
      [{ ...item, videoExpiresAt: 1 }],
      "https://example.com",
      feed,
    );
    expect(expired).not.toContain("<video");
    expect(expired).toContain("<audio");
  });

  test("handles an empty feed", async () => {
    const page = await buildFeedPage([], "https://example.com", feed);
    expect(page).toContain("No episodes yet.");
    expect(page).toContain("0 episodes");
  });

  test("HTTP route keeps podcast requests as RSS and browser pages uncached", async () => {
    const previous = process.env.FEED_BASE_URL;
    process.env.FEED_BASE_URL = "https://example.com";
    try {
      const t = testConvex();
      await t.run(async (ctx) => {
        await ctx.db.insert("feeds", { ...feed, createdAt: 0 });
      });
      const rss = await t.fetch("/feed/private-token");
      expect(rss.headers.get("content-type")).toContain("application/rss+xml");
      expect(await rss.text()).toContain('<rss version="2.0"');
      const page = await t.fetch("/feed/private-token", { headers: browserHeaders });
      expect(page.headers.get("content-type")).toContain("text/html");
      expect(page.headers.get("cache-control")).toBe("no-store");
      expect(page.headers.get("vary")).toBe("Accept, Sec-Fetch-Dest");
      expect(page.headers.get("referrer-policy")).toBe("no-referrer");
      expect(await page.text()).toContain("<!doctype html>");
      const raw = await t.fetch("/feed/private-token?format=rss", { headers: browserHeaders });
      expect(raw.headers.get("content-type")).toContain("application/rss+xml");
    } finally {
      if (previous === undefined) delete process.env.FEED_BASE_URL;
      else process.env.FEED_BASE_URL = previous;
    }
  });
});
