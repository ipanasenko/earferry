import { expect, test } from "@playwright/test";

// The Android share sheet reaches the installed app at /share. Both branches
// run signed out, which is also the case the Android app never handled.
test("a shared YouTube link waits on the landing page until sign-in", async ({ page, baseURL }) => {
  const shared = "Watch this https://youtu.be/dQw4w9WgXcQ";
  await page.goto(
    `/share?title=${encodeURIComponent("A video")}&text=${encodeURIComponent(shared)}`,
  );

  // The link moves into session storage, so it must not linger in the address
  // bar: an OAuth sign-in leaves this page and returns without the query.
  await expect(page).toHaveURL(new URL("/", baseURL).toString());
  await expect(page.getByText("Your link is on the dock.")).toBeVisible();
  await expect(page.getByText("youtu.be/dQw4w9WgXcQ")).toBeVisible();
});

test("a shared article link waits on the landing page like a video", async ({ page, baseURL }) => {
  await page.goto(`/share?text=${encodeURIComponent("https://example.com/some-article")}`);

  await expect(page).toHaveURL(new URL("/", baseURL).toString());
  await expect(page.getByText("Your link is on the dock.")).toBeVisible();
  await expect(page.getByText("example.com/some-article")).toBeVisible();
});

test("a share with no usable link stops with an explanation", async ({ page }) => {
  await page.goto(`/share?text=${encodeURIComponent("just some words, no link")}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "That share had no link we can ferry." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to your queue" })).toBeVisible();
});
