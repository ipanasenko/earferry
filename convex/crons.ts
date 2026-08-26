import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("clean up expired audio", { hours: 1 }, internal.extractor.cleanupExpired);

// Backstop for lost dispatcher kicks: the dispatcher is normally woken by the
// mutation that queued an item or ended an attempt.
crons.interval("dispatch queued extractions", { minutes: 5 }, internal.items.dispatchNext);

export default crons;
