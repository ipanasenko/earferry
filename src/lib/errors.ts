import { ConvexError } from "convex/values";

// Backend mutations throw ConvexError with a user-facing string; anything else
// (network failures, redacted server errors) falls back to the caller's copy.
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ConvexError && typeof error.data === "string" ? error.data : fallback;
}
