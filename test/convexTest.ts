import { convexTest } from "convex-test";
import schema from "../convex/schema";

/**
 * convex-test normally discovers function modules with Vite's
 * `import.meta.glob`, which bun's test runner does not provide, so the map is
 * written out by hand. The "_generated" entry is required: the library locates
 * the Convex root by finding it.
 */
const modules = {
  "./_generated/api.ts": () => import("../convex/_generated/api"),
  "./_generated/server.ts": () => import("../convex/_generated/server"),
  "./analytics.ts": () => import("../convex/analytics"),
  "./crons.ts": () => import("../convex/crons"),
  "./domain.ts": () => import("../convex/domain"),
  "./extractor.ts": () => import("../convex/extractor"),
  "./feed.ts": () => import("../convex/feed"),
  "./feeds.ts": () => import("../convex/feeds"),
  "./http.ts": () => import("../convex/http"),
  "./items.ts": () => import("../convex/items"),
  "./users.ts": () => import("../convex/users"),
};

export function testConvex() {
  return convexTest(schema, modules);
}
