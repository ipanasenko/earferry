import { describe, expect, test } from "bun:test";
import { hasPlan } from "../convex/users";

describe("hasPlan", () => {
  test("accepts the paid plan at user or organization scope", () => {
    expect(hasPlan("u:ferry", "ferry")).toBe(true);
    expect(hasPlan("o:ferry", "ferry")).toBe(true);
  });

  test("rejects another plan or a malformed claim", () => {
    expect(hasPlan("u:free_user", "ferry")).toBe(false);
    expect(hasPlan("ferry", "ferry")).toBe(false);
    expect(hasPlan("u:ferry:extra", "ferry")).toBe(false);
    expect(hasPlan(undefined, "ferry")).toBe(false);
  });
});
