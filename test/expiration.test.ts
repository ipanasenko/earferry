import { describe, expect, test } from "bun:test";
import { isExpiredReady } from "../convex/domain";

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
