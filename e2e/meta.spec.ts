import { expect, test } from "@playwright/test";

// Link previews are the acquisition channel for an invite-only product: people
// paste the URL into a chat. Unfurlers do not run JavaScript, so the card has
// to survive in the raw HTML that ships from disk.
test("the shipped HTML carries the unfurl card", async ({ request }) => {
  const html = await (await request.get("/")).text();

  expect(html).toContain('<link rel="canonical" href="https://earferry.com/" />');
  expect(html).toContain('<meta property="og:type" content="website" />');
  expect(html).toContain('<meta property="og:image" content="https://earferry.com/og-card.png" />');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
});

test("robots.txt keeps crawlers off the private feeds", async ({ request }) => {
  const response = await request.get("/robots.txt");

  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Disallow: /feed/");
});

const TITLES = [
  ["/", "EarFerry · Shipping YouTube to your podcasts"],
  ["/join", "Join the waitlist · EarFerry"],
  ["/privacy", "Privacy · EarFerry"],
  ["/terms", "Terms · EarFerry"],
  ["/support", "Support · EarFerry"],
] as const;

for (const [path, title] of TITLES) {
  test(`${path} sets its own title and canonical`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://earferry.com${path}`,
    );
  });
}

// Cloudflare answers unknown paths with index.html and status 200, so the page
// itself is the only thing that can say it is not a real page.
test("the 404 page declares itself unindexable", async ({ page }) => {
  await page.goto("/a-page-that-never-sailed");

  await expect(page).toHaveTitle("Page not found · EarFerry");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
