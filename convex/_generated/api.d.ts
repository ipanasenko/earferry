/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as analytics from "../analytics.js";
import type * as billing from "../billing.js";
import type * as crons from "../crons.js";
import type * as domain from "../domain.js";
import type * as extractor from "../extractor.js";
import type * as feed from "../feed.js";
import type * as http from "../http.js";
import type * as identity from "../identity.js";
import type * as items from "../items.js";
import type * as users from "../users.js";

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";

declare const fullApi: ApiFromModules<{
  analytics: typeof analytics;
  billing: typeof billing;
  crons: typeof crons;
  domain: typeof domain;
  extractor: typeof extractor;
  feed: typeof feed;
  http: typeof http;
  identity: typeof identity;
  items: typeof items;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;

export declare const components: {
  polar: import("@convex-dev/polar/_generated/component.js").ComponentApi<"polar">;
};
