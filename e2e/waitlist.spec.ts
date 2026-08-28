import { expect, test } from "@playwright/test";

test("the landing page sends people to the waitlist, not to checkout", async ({ page }) => {
  await page.goto("/");

  const cta = page.getByRole("link", { name: "Join the waitlist" });
  await expect(cta).toBeVisible();
  await expect(cta).toHaveAttribute("href", "/join");

  await cta.click();
  await expect(page.getByRole("heading", { level: 1, name: "Join the waitlist." })).toBeVisible();
});

// Guards the rule in docs/ARCHITECTURE.md: donating must never look like the way
// in. Footer renders the link by default, so this is one prop away from
// regressing.
test("the waitlist page offers no way to pay", async ({ page }) => {
  await page.goto("/join");

  await expect(page.getByRole("heading", { level: 1, name: "Join the waitlist." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Donate" })).toHaveCount(0);
});

test("every other page does offer the donate link", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Donate" })).toBeVisible();
});
