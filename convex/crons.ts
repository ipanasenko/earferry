import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("clean up expired audio", { hours: 1 }, internal.extractor.cleanupExpired);

// Backstop for lost submission kicks. The Durable Object owns execution order;
// this only makes sure every due Convex item was idempotently submitted.
crons.interval("dispatch queued extractions", { minutes: 5 }, internal.items.dispatchNext);

export default crons;
