// The Convex runtime exposes deployment environment variables on process.env,
// but the convex tsconfig does not include Node types. Declare just the shape
// that is actually available.
//
// Expected variables include INTERNAL_SECRET, MEDIA_BASE_URL, and POSTHOG_KEY
// (server-side analytics; capture is a no-op when unset).
declare const process: {
  env: Record<string, string | undefined>;
};
