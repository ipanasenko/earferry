import type { buildFeed } from "./feed";
import { feedMediaUrls } from "./feed";

// Only browser document navigation gets HTML. Podcast clients keep RSS even
// if their broad Accept header happens to include text/html.
export function wantsFeedPage(request: Request): boolean {
  return (
    new URL(request.url).searchParams.get("format") !== "rss" &&
    request.headers.get("sec-fetch-dest") === "document" &&
    (request.headers.get("accept") ?? "").split(",").some((entry) => {
      const [type, ...parameters] = entry.trim().split(";");
      const quality = parameters.find((part) => part.trim().startsWith("q="));
      return type === "text/html" && (!quality || Number(quality.trim().slice(2)) > 0);
    })
  );
}

function html(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function url(value: string | undefined): string {
  try {
    const parsed = new URL(value ?? "");
    return ["https:", "http:"].includes(parsed.protocol) ? html(parsed.href) : "";
  } catch {
    return "";
  }
}

export async function buildFeedPage(
  ...[items, origin, feed, displayName]: Parameters<typeof buildFeed>
): Promise<string> {
  const base = origin.replace(/\/$/, "");
  const feedUrl = `${base}/feed/${encodeURIComponent(feed.slug ?? feed.feedToken)}`;
  const title = feed.title ?? (displayName ? `EarFerry · Captained by ${displayName}` : "EarFerry");
  const description = feed.description ?? "YouTube videos saved for listening later.";
  const media = await feedMediaUrls(items, feed.feedToken);
  const artwork = process.env.CHANNEL_ART_URL;
  const episodes = items
    .map((item, index) => {
      const title = item.title ?? (item.kind === "article" ? "Article audio" : "YouTube audio");
      const { audio, video } = media[index];
      return `<article>
      <div>${item.artworkUrl ? `<img class="art" src="${url(item.artworkUrl)}" alt="" loading="lazy">` : ""}</div>
      <div>
        <h2><a href="${url(item.url)}" rel="noreferrer">${html(title)}</a></h2>
        <p class="meta">${item.channel ? `<strong>${html(item.channel)}</strong><br>` : ""}${html(new Date(item.readyAt ?? item.addedAt).toUTCString())}</p>
        ${video ? `<video controls preload="none" src="${url(video)}" ${item.artworkUrl ? `poster="${url(item.artworkUrl)}"` : ""} aria-label="${html(title)}"></video>` : ""}
        <audio controls preload="none" src="${url(audio)}" aria-label="Audio: ${html(title)}"></audio>
        <details><summary>Episode details</summary><p class="description">${html(item.description)}</p><a href="${url(item.url)}" rel="noreferrer">Open original</a></details>
      </div>
    </article>`;
    })
    .join("");
  return `<!doctype html>
<html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer"><meta name="robots" content="noindex, nofollow, noarchive">
  <title>${html(title)}</title>
  <link rel="alternate" type="application/rss+xml" title="${html(title)}" href="${url(feedUrl)}">
  <style>${styles}</style>
</head><body><main>
  <header>${artwork ? `<img src="${url(artwork)}" alt="Podcast cover">` : ""}<div>
    <a class="brand" href="${url(base)}">EarFerry</a><h1>${html(title)}</h1>
    <p>${html(description)}</p><p>${items.length} ${items.length === 1 ? "episode" : "episodes"}</p>
  </div></header>
  <p class="subscribe">To listen in your podcast app, add this page’s address as a feed URL. <a href="${url(`${feedUrl}?format=rss`)}">View RSS</a></p>
  <section class="episodes" aria-label="Episodes">${episodes || '<p class="empty">No episodes yet. Saved videos and articles will appear here when their audio is ready.</p>'}</section>
  <footer>Saved for listening later with <a href="${url(base)}">EarFerry</a>.</footer>
</main></body></html>`;
}

const styles = `
:root { color-scheme: light dark; --bg: #f4f7f9; --surface: #fff; --ink: #1b3a5b; --text: #101418; --muted: #5a6470; --border: #e8ebee; --link: #2c6e9e; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 Inter, system-ui, sans-serif; }
  main { max-width: 1040px; margin: 48px auto; padding: 0 24px; }
  a { color: var(--link); text-underline-offset: 4px; overflow-wrap: anywhere; }
  a:focus-visible, summary:focus-visible { outline: 3px solid #f5b700; outline-offset: 5px; }
  header { display: flex; align-items: center; gap: 40px; padding: 36px; background: var(--ink); color: white; border-radius: 16px; }
  header a { color: white; }
  header img { width: 180px; height: 180px; border-radius: 12px; object-fit: cover; }
  h1 { font-size: clamp(26px, 4vw, 38px); line-height: 1.2; margin: 16px 0; letter-spacing: -.02em; }
  h2 { font-size: 22px; line-height: 1.4; margin: 0 0 8px; }
  p { margin: 12px 0; max-width: 70ch; }
  .brand { font-weight: 700; }
  .subscribe { padding: 24px 0; color: var(--muted); }
  .episodes { background: var(--surface); border-radius: 16px; padding: 0 32px; }
  article { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 28px; padding: 32px 0; border-bottom: 1px solid var(--border); }
  article:last-child { border: 0; }
  .art { width: 150px; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
  .meta { color: var(--muted); margin: 8px 0 16px; font-size: 14px; }
  audio, video { display: block; width: 100%; margin: 16px 0; }
  video { max-height: 420px; background: #101418; border-radius: 8px; }
  summary { cursor: pointer; color: var(--link); width: fit-content; }
  .description { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; }
  .empty { padding: 32px 0; }
  footer { color: var(--muted); padding: 24px 0; font-size: 14px; }
  @media (prefers-color-scheme: dark) { :root { --bg: #101418; --surface: #19232d; --text: #f4f7f9; --muted: #a9c6db; --border: #314556; --link: #a9c6db; } }
  @media (max-width: 640px) { main { margin: 20px auto; padding: 0 16px; } header { padding: 24px; gap: 20px; flex-direction: column; align-items: flex-start; } header img { width: 104px; height: 104px; } .episodes { padding: 0 20px; } article { grid-template-columns: minmax(0, 1fr); gap: 16px; } .art { width: 96px; } }
`;
