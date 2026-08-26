import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("clean up expired audio", { hours: 1 }, internal.extractor.cleanupExpired);

export default crons;
