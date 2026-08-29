import posthog from "posthog-js";

// Public write-only key; safe to expose client-side. Absent in local dev
// without a key, in which case every helper is a no-op.
const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

export const analyticsEnabled = Boolean(key);

export function initAnalytics() {
  if (!key) return;
  posthog.init(key, {
    api_host: "https://eu.i.posthog.com",
    // The 2025-05-24 defaults enable history-based SPA pageview capture.
    defaults: "2025-05-24",
    // EarFerry only needs explicit product events and page views. Avoid
    // collecting page contents, console output, performance traces, or
    // recordings that may contain URLs from a user's private queue.
    autocapture: false,
    disable_session_recording: true,
    capture_exceptions: false,
    capture_performance: false,
  });
  posthog.register({ product: "earferry" });
}

export type AnalyticsEvent =
  | "waitlist_clicked"
  | "signin_clicked"
  | "item_added"
  | "item_add_failed"
  | "item_removed"
  | "item_retried"
  | "feed_url_copied"
  | "feed_url_rotated"
  | "sample_feed_opened"
  | "sample_feed_url_copied"
  | "donate_clicked";

export function track(event: AnalyticsEvent, props?: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  posthog.capture(event, props);
}

export function identify(distinctId: string, props?: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  posthog.identify(distinctId, props);
}

export function resetIdentity() {
  if (!analyticsEnabled) return;
  posthog.reset();
}
