import { describe, expect, test } from "bun:test";
import { homeViewForAuth } from "../src/lib/homeView";

describe("home view during authentication", () => {
  test("does not show the signed-out landing page before auth resolves", () => {
    expect(homeViewForAuth(false, undefined)).toBe("loading");
  });

  test("shows the landing page only after Clerk confirms sign-out", () => {
    expect(homeViewForAuth(true, false)).toBe("landing");
  });

  test("shows the queue after Clerk confirms sign-in", () => {
    expect(homeViewForAuth(true, true)).toBe("queue");
  });
});
