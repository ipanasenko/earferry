/**
 * Pulls the YouTube link out of shared text.
 *
 * Android's share system has no URL extra, so nothing that reaches a share
 * target arrives as a bare URL: YouTube sends "Title\nhttps://youtu.be/…", a
 * chat app sends whatever the person had selected. Chrome maps those onto the
 * `text` and `title` fields and leaves `url` empty on Android, which is why
 * every field is worth scanning.
 *
 * Ported from the Android share activity this replaced, and deliberately kept
 * as strict about hosts: an "add this link" action that guesses wrong is worse
 * than one that declines.
 */
const HTTP_URL = /https?:\/\/[^\s<>]+/gi;
const TRAILING_PUNCTUATION = /[),.;!?]+$/;

function isYouTubeHost(host: string): boolean {
  return (
    host === "youtu.be" ||
    host === "youtube.com" ||
    host.endsWith(".youtube.com") ||
    host === "youtube-nocookie.com" ||
    host.endsWith(".youtube-nocookie.com")
  );
}

export function firstYouTubeUrl(...fields: (string | null | undefined)[]): string | null {
  for (const field of fields) {
    if (!field) continue;
    for (const match of field.matchAll(HTTP_URL)) {
      // Shared sentences end in punctuation that the URL matcher swallows.
      const candidate = match[0].replace(TRAILING_PUNCTUATION, "");
      let host: string;
      try {
        host = new URL(candidate).hostname.toLowerCase();
      } catch {
        continue;
      }
      if (isYouTubeHost(host)) return candidate;
    }
  }
  return null;
}

/** `https://www.youtube.com/watch?v=x` reads as `youtube.com/watch?v=x`. */
export function shortenUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
}
