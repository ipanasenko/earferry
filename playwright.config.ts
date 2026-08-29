import { defineConfig } from "@playwright/test";

// Against a deployed origin (a PR preview, or production after a deploy) there
// is nothing to start locally, and `vite preview` would only serve the static
// bundle anyway — it does not run the Worker that serves /feed/*.
const deployedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const localBaseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: deployedBaseUrl ?? localBaseUrl,
  },
  ...(deployedBaseUrl
    ? {}
    : {
        webServer: {
          command: "bun run preview -- --host 127.0.0.1",
          url: localBaseUrl,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
