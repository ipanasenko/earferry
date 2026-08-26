// RSS 2.0 podcast feed builder, ported from the private listen-later project
// (cloudflare/feed.js).

import type { Doc } from "./_generated/dataModel";

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

function chapterXml(description: string | undefined): string {
  const chapters = parseYouTubeChapters(description);
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

export function buildFeed(items: Array<Doc<"items">>, origin: string, feedToken: string): string {
  const base = origin.replace(/\/$/, "");
  const feedUrl = `${base}/feed/${encodeURIComponent(feedToken)}`;
  const feedDescription = "YouTube videos saved for listening later.";
  const media = (itemId: string) =>
    `${base}/media/${encodeURIComponent(feedToken)}/${encodeURIComponent(itemId)}.mp3`;

  const entries = items
    .map((item) => {
      const description = [
        item.description ||
          (item.channel
            ? `${item.title ?? "YouTube audio"} — ${item.channel}`
            : (item.title ?? "YouTube audio")),
        `Original video: ${item.url}`,
      ].join("\n\n");
      return `
    <item>
      <title>${xml(item.title ?? "YouTube audio")}</title>
      <link>${xml(item.url)}</link>
      <guid isPermaLink="false">${xml(item._id)}</guid>
      <pubDate>${new Date(item.publishedAt ?? item.addedAt).toUTCString()}</pubDate>
      <description>${xml(description)}</description>
      ${chapterXml(item.description)}
      ${item.artworkUrl ? `<itunes:image href="${xml(item.artworkUrl)}" />` : ""}
      ${
        Number(item.durationSeconds) > 0
          ? `<itunes:duration>${Math.round(Number(item.durationSeconds))}</itunes:duration>`
          : ""
      }
      <enclosure url="${xml(media(item._id))}" length="${Number(item.sizeBytes) || 0}" type="audio/mpeg" />
    </item>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:psc="http://podlove.org/simple-chapters">
  <channel>
    <title>EarFerry</title>
    <link>${xml(base)}</link>
    <description>${xml(feedDescription)}</description>
    <language>en</language>
    <itunes:author>EarFerry</itunes:author>
    <itunes:summary>${xml(feedDescription)}</itunes:summary>
    <itunes:explicit>false</itunes:explicit>
    <atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml" />${entries}
  </channel>
</rss>`;
}
