import { describe, expect, test } from "bun:test";
import manifest from "../public/manifest.webmanifest" with { type: "json" };
import { firstYouTubeUrl, shortenUrl } from "../src/lib/shareUrl";

describe("share target link extraction", () => {
  // The four cases the Android share activity was tested against, kept as the
  // floor for its replacement.
  test("finds a link inside shared prose", () => {
    expect(firstYouTubeUrl("Watch this https://youtu.be/abcdefghijk")).toBe(
      "https://youtu.be/abcdefghijk",
    );
  });

  test("drops the punctuation that ends a shared sentence", () => {
    expect(firstYouTubeUrl("https://www.youtube.com/watch?v=abcdefghijk).")).toBe(
      "https://www.youtube.com/watch?v=abcdefghijk",
    );
  });

  test("refuses a host that only looks like YouTube", () => {
    expect(firstYouTubeUrl("https://notyoutube.com/watch?v=abcdefghijk")).toBeNull();
    expect(firstYouTubeUrl("https://youtube.com.evil.test/watch?v=abcdefghijk")).toBeNull();
  });

  test("returns nothing when the share carries no link", () => {
    expect(firstYouTubeUrl("No URL here")).toBeNull();
    expect(firstYouTubeUrl(null, undefined, "")).toBeNull();
  });

  test("accepts the hosts YouTube itself shares from", () => {
    for (const url of [
      "https://youtu.be/abcdefghijk",
      "https://m.youtube.com/watch?v=abcdefghijk",
      "https://music.youtube.com/watch?v=abcdefghijk",
      "https://www.youtube-nocookie.com/embed/abcdefghijk",
      "http://youtube.com/shorts/abcdefghijk",
    ]) {
      expect(firstYouTubeUrl(url)).toBe(url);
    }
  });

  // Android has no URL extra, so Chrome leaves `url` empty and the link lands
  // in `text`, or occasionally in `title`. Every field has to be searched.
  test("scans every share field, skipping the ones Android leaves empty", () => {
    expect(firstYouTubeUrl(null, null, "https://youtu.be/abcdefghijk")).toBe(
      "https://youtu.be/abcdefghijk",
    );
    expect(firstYouTubeUrl("A talk about ferries", "https://youtu.be/abcdefghijk")).toBe(
      "https://youtu.be/abcdefghijk",
    );
  });

  test("prefers the first YouTube link over an earlier link to somewhere else", () => {
    expect(firstYouTubeUrl("https://example.com and https://youtu.be/abcdefghijk")).toBe(
      "https://youtu.be/abcdefghijk",
    );
  });

  test("survives a malformed URL sitting in front of a good one", () => {
    expect(firstYouTubeUrl("https://:::/ https://youtu.be/abcdefghijk")).toBe(
      "https://youtu.be/abcdefghijk",
    );
  });
});

describe("shortenUrl", () => {
  test("strips the scheme and the www nobody reads", () => {
    expect(shortenUrl("https://www.youtube.com/watch?v=abcdefghijk")).toBe(
      "youtube.com/watch?v=abcdefghijk",
    );
    expect(shortenUrl("https://youtu.be/abcdefghijk")).toBe("youtu.be/abcdefghijk");
  });
});

describe("web app manifest", () => {
  // The manifest is what puts EarFerry in the Android share sheet; a typo here
  // fails silently on a device nobody is holding during CI.
  test("registers the share target that replaced the Android app", () => {
    expect(manifest.share_target).toEqual({
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    });
  });

  test("keeps the action inside the manifest scope", () => {
    expect(manifest.share_target.action.startsWith(manifest.scope)).toBe(true);
  });

  test("stays installable, which is what makes the share target appear", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(["fullscreen", "standalone", "minimal-ui"]).toContain(manifest.display);
    const sizes = manifest.icons.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });
});
