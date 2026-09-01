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

test("a shared link that is not from YouTube stops with an explanation", async ({ page }) => {
  await page.goto(`/share?text=${encodeURIComponent("https://example.com/some-video")}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "That link isn't from YouTube." }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to your queue" })).toBeVisible();
});
