import { describe, expect, test } from "bun:test";
import { parseYouTubeChapters, withIntroChapter } from "../convex/feed";

describe("parseYouTubeChapters", () => {
  test("reads a plain YouTube chapter list", () => {
    expect(
      parseYouTubeChapters(["0:00 Welcome", "1:30 - The middle bit", "12:04 | Wrap up"].join("\n")),
    ).toEqual([
      { start: "0:00", title: "Welcome" },
      { start: "1:30", title: "The middle bit" },
      { start: "12:04", title: "Wrap up" },
    ]);
  });

  test("orders by time and drops duplicate timestamps", () => {
    expect(parseYouTubeChapters(["5:00 Later", "0:00 First", "5:00 Repeat"].join("\n"))).toEqual([
      { start: "0:00", title: "First" },
      { start: "5:00", title: "Later" },
    ]);
  });

  test("ignores timestamps that are not at the start of a line", () => {
    // Descriptions are full of prose like "subscribe at 9:00", so the timestamp
    // has to open the line to count as a chapter.
    expect(
      parseYouTubeChapters(
        ["1:30", "Subscribe at 9:00 for more", "99:99 Broken", "0:00 Real"].join("\n"),
      ),
    ).toEqual([{ start: "0:00", title: "Real" }]);
  });
});

describe("withIntroChapter", () => {
  // The bug this exists for: a description whose first timestamp is not 0:00
  // leaves the opening minutes unnamed, and players label that gap themselves.
  test("names the gap before the first timestamp", () => {
    expect(
      withIntroChapter([
        { start: "1:30", title: "The middle bit" },
        { start: "12:04", title: "Wrap up" },
      ]),
    ).toEqual([
      { start: "0:00", title: "Intro" },
      { start: "1:30", title: "The middle bit" },
      { start: "12:04", title: "Wrap up" },
    ]);
  });

  test("matches the timestamp shape already in use", () => {
    expect(withIntroChapter([{ start: "01:02:03", title: "Late start" }])[0]).toEqual({
      start: "00:00:00",
      title: "Intro",
    });
  });

  test("leaves a list that already starts at zero alone", () => {
    const chapters = [
      { start: "0:00", title: "Welcome" },
      { start: "1:30", title: "The middle bit" },
    ];
    expect(withIntroChapter(chapters)).toEqual(chapters);
  });

  test("leaves an empty list alone, so no chapters element is emitted", () => {
    expect(withIntroChapter([])).toEqual([]);
  });
});
