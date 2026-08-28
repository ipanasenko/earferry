import { describe, expect, test } from "bun:test";
import { isEntitled } from "../convex/billing";

describe("isEntitled", () => {
  test("accepts a paying or trialing Polar subscription", () => {
    expect(isEntitled("active")).toBe(true);
    expect(isEntitled("trialing")).toBe(true);
  });

  test("rejects a subscription that is not paying yet or no longer paying", () => {
    expect(isEntitled("incomplete")).toBe(false);
    expect(isEntitled("incomplete_expired")).toBe(false);
    expect(isEntitled("past_due")).toBe(false);
    expect(isEntitled("unpaid")).toBe(false);
    expect(isEntitled("canceled")).toBe(false);
  });

  test("rejects a missing subscription", () => {
    expect(isEntitled(undefined)).toBe(false);
    expect(isEntitled(null)).toBe(false);
  });
});
