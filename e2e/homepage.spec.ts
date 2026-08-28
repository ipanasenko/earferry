import { expect, test } from "@playwright/test";

test("renders the public homepage", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "YouTube for your ears, delivered to your podcast app.",
    }),
  ).toBeVisible();
});
