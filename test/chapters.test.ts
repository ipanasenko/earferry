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

  test("reads the parenthesized chapters from video rNdfQ6mRXAQ", () => {
    const chapters = [
      { start: "00:00", title: "Why technical expertise still matters with AI" },
      { start: "05:27", title: "Agile, customer contact and organisational change" },
      { start: "08:39", title: "Learning from customers without losing technical depth" },
      { start: "13:19", title: "Connecting technical requirements to customer needs" },
      { start: "18:00", title: "Clean code, static analysis and quality metrics for agents" },
      { start: "23:48", title: "Enforcing architecture and checking behaviour with tests" },
      { start: "28:26", title: "TDD, reading less code and staying technically in control" },
      { start: "34:27", title: "Where deep specialists matter and who can build with AI" },
      { start: "40:30", title: "Where to find Robert" },
    ];
    const description = [
      "In this episode, we cover:",
      ...chapters.map(({ start, title }) => `(${start}) ${title}`),
      "",
      "Referenced:",
      "• Clean Code: https://www.informit.com/",
    ].join("\n");

    expect(parseYouTubeChapters(description)).toEqual(chapters);
  });

  test("supports timestamp wrappers, formatting and hour-long chapters", () => {
    expect(
      parseYouTubeChapters(
        ["[0:00] Welcome", "- **(05:27)** – Middle", "(01:02:03) | Closing"].join("\n"),
      ),
    ).toEqual([
      { start: "0:00", title: "Welcome" },
      { start: "05:27", title: "Middle" },
      { start: "01:02:03", title: "Closing" },
    ]);
  });

  test("rejects malformed wrappers and invalid parenthesized timestamps", () => {
    expect(
      parseYouTubeChapters(
        [
          "(0:00] Mismatched",
          "(1:30 Missing close",
          "(99:99) Broken",
          "(1:30)",
          "Subscribe at (9:00) for more",
        ].join("\n"),
      ),
    ).toEqual([]);
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
