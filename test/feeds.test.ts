import { describe, expect, test } from "bun:test";
import type { Doc } from "../convex/_generated/dataModel";
import { feedPath, SAMPLE_FEED_SLUG } from "../convex/feeds";

function feed(overrides: Partial<Doc<"feeds">> = {}): Doc<"feeds"> {
  return {
    _id: "feed-id",
    _creationTime: 0,
    feedToken: "a".repeat(64),
    createdAt: 0,
    ...overrides,
  } as Doc<"feeds">;
}

describe("feed addressing", () => {
  test("a private feed is addressed by its token", () => {
    expect(feedPath(feed())).toBe(`/feed/${"a".repeat(64)}`);
  });

  test("a public feed is addressed by its slug, never its token", () => {
    const path = feedPath(feed({ slug: SAMPLE_FEED_SLUG }));
    expect(path).toBe("/feed/sample");
    expect(path).not.toContain("a".repeat(64));
  });

  test("a slug that needs escaping is escaped", () => {
    expect(feedPath(feed({ slug: "a b" }))).toBe("/feed/a%20b");
  });
});
