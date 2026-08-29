import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("clean up expired audio", { hours: 1 }, internal.extractor.cleanupExpired);

// Backstop for lost submission kicks. The Durable Object owns execution order;
// this only makes sure every due Convex item was idempotently submitted.
crons.interval("dispatch queued extractions", { minutes: 5 }, internal.items.dispatchNext);

// The public demo enclosures never expire, so nothing needs renewing. This only
// re-checks that each MP3 is still in R2 and lets verifyAudio re-extract any
// that went missing, which is the one way a showroom feed can quietly rot.
crons.daily(
  "verify permanent feed audio",
  { hourUTC: 3, minuteUTC: 17 },
  internal.items.verifyPermanentFeeds,
);

export default crons;
