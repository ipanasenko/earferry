import { describe, expect, test } from "bun:test";
import { isWaitingLiveStatus, nextCheckDelay, waitingDescription } from "../convex/domain";

describe("premiere and live scheduling", () => {
  test("caps distant premiere checks at thirty minutes", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(nextCheckDelay({ release_timestamp: now / 1_000 + 86_400 }, now)).toBe(30 * 60_000);
  });

  test("checks shortly after a nearby scheduled release", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(nextCheckDelay({ release_timestamp: now / 1_000 + 120 }, now)).toBe(7 * 60_000);
  });

  test("describes distinct live states", () => {
    expect(waitingDescription({ live_status: "is_live" })).toContain("Live now");
    expect(waitingDescription({ live_status: "post_live" })).toContain("finish processing");
    expect(waitingDescription({ live_status: "is_upcoming" })).toContain("Upcoming");
  });

  test("waits only for explicit live and premiere states", () => {
    expect(isWaitingLiveStatus("is_upcoming")).toBe(true);
    expect(isWaitingLiveStatus("is_live")).toBe(true);
    expect(isWaitingLiveStatus("post_live")).toBe(true);

    expect(isWaitingLiveStatus("not_live")).toBe(false);
    expect(isWaitingLiveStatus("was_live")).toBe(false);
    expect(isWaitingLiveStatus(null)).toBe(false);
    expect(isWaitingLiveStatus(undefined)).toBe(false);
    expect(isWaitingLiveStatus("unknown_future_status")).toBe(false);
  });

  test("waits for a future release even when the video is reported as not live", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    const release = now / 1_000 + 3_600;

    expect(isWaitingLiveStatus("not_live", release, now)).toBe(true);
    expect(isWaitingLiveStatus("not_live", now / 1_000 - 1, now)).toBe(false);
    expect(waitingDescription({ live_status: "not_live", release_timestamp: release })).toContain(
      "Scheduled for",
    );
  });
});
