import { describe, expect, test } from "bun:test";
import { MAX_AUTO_RETRIES, retryDelayMs } from "../convex/domain";

describe("extraction retry schedule", () => {
  test("waits 5, 10, then 20 minutes without jitter", () => {
    expect(retryDelayMs(0, 0.5)).toBe(5 * 60_000);
    expect(retryDelayMs(1, 0.5)).toBe(10 * 60_000);
    expect(retryDelayMs(2, 0.5)).toBe(20 * 60_000);
  });

  test("spreads simultaneous retries by up to twenty percent", () => {
    expect(retryDelayMs(0, 0)).toBe(4 * 60_000);
    expect(retryDelayMs(0, 1)).toBe(6 * 60_000);
  });

  test("clamps attempts beyond the schedule to the last delay", () => {
    expect(retryDelayMs(7, 0.5)).toBe(20 * 60_000);
    expect(retryDelayMs(-1, 0.5)).toBe(5 * 60_000);
  });

  test("allows three automatic retries", () => {
    expect(MAX_AUTO_RETRIES).toBe(3);
  });
});
