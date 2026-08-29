// RSS 2.0 podcast feed builder, ported from the private listen-later project
// (cloudflare/feed.js).

import type { Doc } from "./_generated/dataModel";

// ---- Worker media URLs -----------------------------------------------------
// Media is served by the earferry-extractor Worker:
//   GET {MEDIA_BASE_URL}/media/{feedToken}/{itemId}.mp3?s={sig}
//   sig = hex(HMAC-SHA256(INTERNAL_SECRET, `${feedToken}/${itemId}`))
// These helpers run in HTTP actions (crypto.subtle is available there).

export function mediaBaseUrl(): string {
  const base = process.env.MEDIA_BASE_URL;
  if (!base) throw new Error("MEDIA_BASE_URL must be set");
  return base.replace(/\/$/, "");
}

export async function signMediaPath(feedToken: string, itemId: string): Promise<string> {
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) throw new Error("INTERNAL_SECRET must be set");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${feedToken}/${itemId}`));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function signedMediaUrl(feedToken: string, itemId: string): Promise<string> {
  const sig = await signMediaPath(feedToken, itemId);
  return `${mediaBaseUrl()}/media/${encodeURIComponent(feedToken)}/${encodeURIComponent(itemId)}.mp3?s=${sig}`;
}

export async function signedArtworkUrl(feedToken: string, itemId: string): Promise<string> {
  const sig = await signMediaPath(feedToken, itemId);
  return `${mediaBaseUrl()}/media/${encodeURIComponent(feedToken)}/${encodeURIComponent(itemId)}.jpg?s=${sig}`;
}

function xml(value: unknown = ""): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const chapterTimestamp = String.raw`\d{1,4}:\d{2}(?::\d{2})?`;
const chapterLine = new RegExp(
  String.raw`^\s*(?:[-*+•]\s*)?(?:#{1,6}\s*)?(?:\*\*)?(?:\[(${chapterTimestamp})\]|(${chapterTimestamp}))(?:\*\*)?(?:\s*[-–—|:]\s*|\s+)(.+?)\s*$`,
  "u",
);

function timestampSeconds(value: string): number | null {
  const parts = value.split(":").map(Number);
  const seconds = parts.pop()!;
  const minutes = parts.pop()!;
  const hours = parts.length ? parts.pop()! : 0;
  if (![hours, minutes, seconds].every(Number.isFinite) || minutes > 59 || seconds > 59) {
    return null;
  }
  return hours * 3_600 + minutes * 60 + seconds;
}

export function parseYouTubeChapters(
  description: unknown,
): Array<{ start: string; title: string }> {
  if (typeof description !== "string") return [];

  const chapters: Array<{ start: string; title: string; seconds: number; index: number }> = [];
  for (const [index, line] of description.split(/\r?\n/).entries()) {
    const match = line.match(chapterLine);
    if (!match) continue;

    const start = match[1] ?? match[2];
    const seconds = timestampSeconds(start);
    const title = match[3].trim();
    if (seconds === null || !title) continue;
    chapters.push({ start, title, seconds, index });
  }

  const seen = new Set<number>();
  return chapters
    .sort((left, right) => left.seconds - right.seconds || left.index - right.index)
    .filter((chapter) => {
      if (seen.has(chapter.seconds)) return false;
      seen.add(chapter.seconds);
      return true;
    })
    .map(({ start, title }) => ({ start, title }));
}

// Players tile chapters across the whole episode, so when a description's first
// timestamp is not 0:00 the leading gap gets a synthesised name like
// "Untitled Chapter 1". Name it ourselves instead.
export function withIntroChapter(
  chapters: Array<{ start: string; title: string }>,
): Array<{ start: string; title: string }> {
  const first = chapters[0];
  if (!first || timestampSeconds(first.start) === 0) return chapters;
  // Match the shape of the timestamps already in the list, so one feed does not
  // mix "0:00" and "00:00:00".
  const zero = first.start.split(":").length === 3 ? "00:00:00" : "0:00";
  return [{ start: zero, title: "Intro" }, ...chapters];
}

function chapterXml(description: string | undefined): string {
  const chapters = withIntroChapter(parseYouTubeChapters(description));
  if (chapters.length === 0) return "";
  return `
      <psc:chapters version="1.2">${chapters
        .map(
          ({ start, title }) => `
        <psc:chapter start="${xml(start)}" title="${xml(title)}" />`,
        )
        .join("")}
      </psc:chapters>`;
}

/**
 * A public feed publishes its slug and its own branding; a private feed
 * publishes its token and is named after its owner. Both are the same record,
 * so the only branch here is which fields are set.
 */
export async function buildFeed(
  items: Array<Doc<"items">>,
  origin: string,
  feed: Pick<Doc<"feeds">, "feedToken" | "slug" | "title" | "description">,
  displayName?: string,
): Promise<string> {
  const base = origin.replace(/\/$/, "");
  const path = feed.slug
    ? `/feed/${encodeURIComponent(feed.slug)}`
    : `/feed/${encodeURIComponent(feed.feedToken)}`;
  const feedUrl = `${base}${path}`;
  // Channel art: the app serves the logo as a static asset.
  const channelArtUrl = process.env.CHANNEL_ART_URL ?? null;
  const feedDescription = feed.description ?? "YouTube videos saved for listening later.";
  const feedName =
    feed.title ?? (displayName ? `EarFerry · Captained by ${displayName}` : "EarFerry");
  // Items store their signed Worker media URL when they become ready; sign on
  // the fly for anything that predates that.
  const mediaUrls = await Promise.all(
    items.map((item) => item.mediaUrl ?? signedMediaUrl(feed.feedToken, item._id)),
  );

  const entries = items
    .map((item, index) => {
      const media = mediaUrls[index];
      const description = [
        item.description ||
          (item.channel
            ? `${item.title ?? "YouTube audio"} · ${item.channel}`
            : (item.title ?? "YouTube audio")),
        `Original video: ${item.url}`,
      ].join("\n\n");
      return `
    <item>
      <title>${xml(item.title ?? "YouTube audio")}</title>
      <link>${xml(item.url)}</link>
      <guid isPermaLink="false">${xml(item._id)}</guid>
      <pubDate>${new Date(item.addedAt).toUTCString()}</pubDate>
      <description>${xml(description)}</description>
      ${chapterXml(item.description)}
      ${item.artworkUrl ? `<itunes:image href="${xml(item.artworkUrl)}" />` : ""}
      ${
        Number(item.durationSeconds) > 0
          ? `<itunes:duration>${Math.round(Number(item.durationSeconds))}</itunes:duration>`
          : ""
      }
      <enclosure url="${xml(media)}" length="${Number(item.sizeBytes) || 0}" type="audio/mpeg" />
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:psc="http://podlove.org/simple-chapters">
  <channel>
    <title>${xml(feedName)}</title>
    <link>${xml(base)}</link>
    <description>${xml(feedDescription)}</description>
    <language>en</language>
    <itunes:author>${xml(feedName)}</itunes:author>
    <itunes:summary>${xml(feedDescription)}</itunes:summary>
    <itunes:explicit>false</itunes:explicit>${
      channelArtUrl
        ? `
    <itunes:image href="${xml(channelArtUrl)}" />
    <image>
      <url>${xml(channelArtUrl)}</url>
      <title>${xml(feedName)}</title>
      <link>${xml(base)}</link>
    </image>`
        : ""
    }
    <atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml" />${entries}
  </channel>
</rss>`;
}
