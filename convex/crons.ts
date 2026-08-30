import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("clean up expired audio", { hours: 1 }, internal.extractor.cleanupExpired);

// Backstop for lost submission kicks. The Durable Object owns execution order;
// this only makes sure every due Convex item was idempotently submitted.
crons.interval("dispatch queued extractions", { minutes: 5 }, internal.items.dispatchNext);

// Keeps the public showroom whole: gives failed episodes another attempt, since
// nobody owns them to press retry, and re-checks that each MP3 is still in R2.
crons.daily(
  "maintain permanent feeds",
  { hourUTC: 3, minuteUTC: 17 },
  internal.items.maintainPermanentFeeds,
);

export default crons;
