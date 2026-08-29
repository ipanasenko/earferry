/**
 * The public demo feed is a fixed showroom, not a podcast. It holds ten
 * EarFerry-owned episodes that never change, so a visitor can prove the whole
 * crossing works inside their own podcast app before joining the waitlist.
 *
 * It is an ownerless row in the `feeds` table, not an account: `/feed/{slug}`
 * and `/feed/{token}` resolve through the same path in `convex/http.ts`. The
 * feed is marked permanent, so its episodes are never given an `expiresAt` and
 * the enclosures cannot go dead underneath this page.
 */
export const SAMPLE_FEED_PATH = "/feed/sample";

export const SAMPLE_EPISODE_COUNT = 10;

/**
 * Same-origin on purpose: the site's Worker proxies /feed/* to Convex, so the
 * demo URL a visitor copies is the same shape as a real private feed URL.
 */
export function sampleFeedUrl(): string {
  return `${window.location.origin}${SAMPLE_FEED_PATH}`;
}

/** The protocol is noise in a URL someone reads before they copy it. */
export function sampleFeedDisplayUrl(): string {
  return sampleFeedUrl().replace(/^https?:\/\//, "");
}

/**
 * One list, two surfaces: the homepage dialog and the Support page both render
 * these, so the wording cannot drift apart. Deliberately no Spotify entry;
 * it does not reliably accept arbitrary feed URLs.
 */
export const PODCAST_APP_STEPS = [
  {
    badge: "AP",
    name: "Apple Podcasts",
    steps: "Library → More → Follow a Show by URL",
  },
  {
    badge: "URL",
    name: "Overcast, Pocket Casts & others",
    steps: "Look for “Add by URL” or “Add RSS feed”",
  },
] as const;

/** Shown next to the feed so nobody mistakes the demo for a real show. */
export const SAMPLE_EPISODE_PREVIEW = {
  title: "Why sound travels so well over water",
  meta: "EarFerry Sample Crossings · 2–3 min",
  disclaimer: "Original AI-narrated demos",
};
