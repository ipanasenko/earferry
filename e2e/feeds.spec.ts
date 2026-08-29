import { expect, test } from "@playwright/test";

/**
 * These hit a real origin, because /feed/* is served by the Cloudflare Worker
 * (run_worker_first in wrangler.jsonc) and proxied to Convex. The Playwright
 * webServer is `vite preview`, which serves only the static bundle and would
 * answer /feed/sample with the SPA shell, so a test against it would assert
 * nothing.
 *
 *   EARFERRY_FEED_BASE_URL=https://earferry.com \
 *   EARFERRY_FEED_TOKEN=... \
 *   bun run test:e2e
 *
 * Unset by default so the pull-request run stays hermetic.
 */
const baseUrl = process.env.EARFERRY_FEED_BASE_URL;
// Never hard-coded: a feed token is a credential and this repository is public.
const feedToken = process.env.EARFERRY_FEED_TOKEN;

test.skip(!baseUrl, "Set EARFERRY_FEED_BASE_URL to run the live feed tests");

test("the public sample feed is served and published under its slug", async ({ request }) => {
  const response = await request.get(`${baseUrl}/feed/sample`);

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/rss+xml");
  // A public feed is shareable, so it may sit in a shared cache.
  expect(response.headers()["cache-control"]).toContain("public");

  const xml = await response.text();
  expect(xml).toContain("<title>EarFerry · Sample Crossings</title>");
  // The self-link is the slug. A public feed never advertises its token, even
  // though its enclosure URLs are signed with one.
  expect(xml).toContain(`href="${baseUrl}/feed/sample"`);
  expect(xml).toContain("<enclosure ");
});

test("a private feed is served and never shared-cached", async ({ request }) => {
  test.skip(!feedToken, "Set EARFERRY_FEED_TOKEN to run the private feed test");
  const response = await request.get(`${baseUrl}/feed/${feedToken}`);

  // Regression guard for #39: feed resolution must not depend on a migration
  // having run. A URL already sitting in a podcast app cannot start 404ing.
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/rss+xml");
  expect(response.headers()["cache-control"]).toBe("no-cache");
  expect(response.headers()["x-robots-tag"]).toContain("noindex");

  const xml = await response.text();
  expect(xml).toContain("<title>EarFerry");
  expect(xml).toContain(`href="${baseUrl}/feed/${feedToken}"`);
});
