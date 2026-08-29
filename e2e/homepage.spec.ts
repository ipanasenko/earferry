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

test("opens the sample feed dialog and copies the public feed URL", async ({
  page,
  context,
  baseURL,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  await page.getByRole("button", { name: "Add sample feed" }).click();

  const dialog = page.getByRole("dialog", { name: "Add the sample feed" });
  await expect(dialog).toBeVisible();
  // The private token behind /feed/sample must never reach the public copy.
  await expect(dialog).toContainText("/feed/sample");

  await dialog.getByRole("button", { name: "Copy URL" }).click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(new URL("/feed/sample", baseURL).toString());

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
