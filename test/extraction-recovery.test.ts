import { describe, expect, test } from "bun:test";
import { EXTRACTION_LEASE_MS, recoveryDelay } from "../convex/domain";

describe("extraction recovery lease", () => {
  test("recovers once five minutes pass without a heartbeat", () => {
    expect(recoveryDelay(1_000, 1_000 + EXTRACTION_LEASE_MS)).toBe(0);
  });

  test("waits for the remainder of a renewed lease", () => {
    expect(recoveryDelay(60_000, 120_000)).toBe(EXTRACTION_LEASE_MS - 60_000);
  });
});
