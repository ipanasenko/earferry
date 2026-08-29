import { describe, expect, test } from "bun:test";
import { isExpiredReady } from "../convex/domain";
import { renewedAudioExpiry } from "../convex/items";

describe("ready item expiration", () => {
  test("expires ready items once their deadline passes", () => {
    expect(isExpiredReady({ status: "ready", expiresAt: 1_000 }, 1_000)).toBe(true);
  });

  test("keeps unfinished, renewed, and legacy items", () => {
    expect(isExpiredReady({ status: "extracting", expiresAt: 1_000 }, 2_000)).toBe(false);
    expect(isExpiredReady({ status: "ready", expiresAt: 3_000 }, 2_000)).toBe(false);
    expect(isExpiredReady({ status: "ready" }, 2_000)).toBe(false);
  });
});

describe("audio retention renewal", () => {
  test("gives an enclosure a fresh 30 days", () => {
    const now = Date.parse("2026-08-29T00:00:00Z");
    expect(renewedAudioExpiry(now)).toBe(Date.parse("2026-09-28T00:00:00Z"));
  });

  // The sample-feed cron renews every day, so each run must push the deadline
  // past the one the previous run already scheduled an expiry for.
  test("outlives the deadline set a day earlier", () => {
    const yesterday = Date.parse("2026-08-28T00:00:00Z");
    const today = Date.parse("2026-08-29T00:00:00Z");
    expect(renewedAudioExpiry(today)).toBeGreaterThan(renewedAudioExpiry(yesterday));
  });
});
