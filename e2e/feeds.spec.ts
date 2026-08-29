import { expect, test } from "@playwright/test";

/**
 * These need a deployed origin. /feed/* is served by the Cloudflare Worker
 * (run_worker_first in wrangler.jsonc) and proxied to Convex, so the local
 * `vite preview` server would answer with the SPA shell and assert nothing.
 * They run when PLAYWRIGHT_BASE_URL points at a PR preview or production.
 */
const deployed = Boolean(process.env.PLAYWRIGHT_BASE_URL);

// Never hard-coded: a feed token is a credential and this repository is public.
const feedToken = process.env.EARFERRY_FEED_TOKEN;

test.skip(!deployed, "Set PLAYWRIGHT_BASE_URL to run the feed tests");

test("the sample feed is published under its slug", async ({ request, baseURL }) => {
  const response = await request.get("/feed/sample");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/rss+xml");
  // A public feed is shareable, so it may sit in a shared cache.
  expect(response.headers()["cache-control"]).toContain("public");

  const xml = await response.text();
  expect(xml).toContain("<title>EarFerry · Sample Crossings</title>");
  // The self-link is the slug. A public feed never advertises its token, even
  // though its enclosure URLs are signed with one.
  expect(xml).toContain(`href="${baseURL}/feed/sample"`);
});

test("a private feed resolves by token and is never shared-cached", async ({
  request,
  baseURL,
}) => {
  test.skip(!feedToken, "Set EARFERRY_FEED_TOKEN to run the private feed test");
  const response = await request.get(`/feed/${feedToken}`);

  // Regression guard for #39: feed resolution must not depend on a migration
  // having run. A URL already sitting in a podcast app cannot start 404ing.
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/rss+xml");
  expect(response.headers()["cache-control"]).toBe("no-cache");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");

  const xml = await response.text();
  expect(xml).toContain("<title>EarFerry");
  expect(xml).toContain(`href="${baseURL}/feed/${feedToken}"`);
});
