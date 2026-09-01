import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildFeed, signedArtworkUrl, signedMediaUrl } from "./feed";
import { feedBaseUrl } from "./feeds";
import { capture } from "./analytics";

const http = httpRouter();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function internalAuthorized(request: Request): boolean {
  const secret = process.env.INTERNAL_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

// GET /feed/{feedToken}: RSS 2.0 podcast feed of the user's ready items.
// Media enclosures point at the earferry-extractor Worker (MEDIA_BASE_URL).
http.route({
  pathPrefix: "/feed/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    // One path segment resolves either shape: a public feed's slug or a private
    // feed's token. The public demo feed is an ownerless row in `feeds`, so it
    // needs no account, no env var, and no special case here.
    const tokenOrSlug = decodeURIComponent(url.pathname.slice("/feed/".length)).replace(
      /\.xml$/,
      "",
    );
    if (!tokenOrSlug) return json({ error: "Not found" }, 404);

    const found = await ctx.runQuery(internal.items.feedForRequest, { tokenOrSlug });
    if (!found) return json({ error: "Not found" }, 404);
    const { feed, owner, items } = found;

    await capture("feed_fetched", owner?.clerkId ?? `feed:${feed.slug ?? "private"}`);
    // feedBaseUrl, not url.origin: behind the site's /feed/* proxy the request
    // origin is still *.convex.site, which would leak into the self-link.
    const xml = await buildFeed(items, feedBaseUrl(), feed, owner?.displayName);
    return new Response(xml, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        // A private feed must always answer with the queue as it stands. A
        // public feed is a fixed showroom shared from the homepage, so a short
        // shared cache is safe and keeps a burst of visitors off the database.
        "cache-control": feed.slug ? "public, max-age=300" : "no-cache",
      },
    });
  }),
});

// ---- Worker -> Convex callbacks (docs/ARCHITECTURE.md, Extractor Worker
// contract). The earferry-extractor Worker calls these with
// `authorization: Bearer {INTERNAL_SECRET}`. itemId is the Convex item
// document id; the MP3 lives in R2 at items/{itemId}.mp3.

async function readBody<T>(request: Request): Promise<T | null> {
  return (await request.json().catch(() => null)) as T | null;
}

// POST /internal/extract-complete
// { itemId, sizeBytes, durationSeconds?, title?, channel?, description?, publishedAt? }
http.route({
  path: "/internal/extract-complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!internalAuthorized(request)) return json({ error: "Unauthorized" }, 401);
    const body = await readBody<{
      itemId?: string;
      sizeBytes?: number;
      durationSeconds?: number;
      title?: string;
      channel?: string;
      description?: string;
      publishedAt?: number;
      artwork?: boolean;
      attempt?: string;
    }>(request);
    if (!body?.itemId) return json({ error: "itemId is required" }, 400);
    const itemId = body.itemId as Id<"items">;

    const found = await ctx.runQuery(internal.items.itemWithFeed, { itemId }).catch(() => null);
    if (!found) return json({ error: "Item not found" }, 404);
    if (found.item.status === "ready") return json({ ready: true, ignored: true });

    // Signed once here (crypto.subtle is available in HTTP actions) and stored
    // on the item, so queries can return it without signing.
    const mediaUrl = await signedMediaUrl(found.feed.feedToken, itemId);
    const artworkUrl = body.artwork
      ? await signedArtworkUrl(found.feed.feedToken, itemId)
      : undefined;
    const published = await ctx.runMutation(internal.items.markReady, {
      itemId,
      attempt: typeof body.attempt === "string" ? body.attempt : undefined,
      r2Key: `items/${itemId}.mp3`,
      sizeBytes: Number(body.sizeBytes) > 0 ? Number(body.sizeBytes) : undefined,
      durationSeconds: Number(body.durationSeconds) > 0 ? Number(body.durationSeconds) : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      channel: typeof body.channel === "string" ? body.channel : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      publishedAt: Number(body.publishedAt) > 0 ? Number(body.publishedAt) : undefined,
      artworkUrl,
      mediaUrl,
    });
    // A rejected completion makes the Worker delete the R2 objects the stale
    // attempt just published under this item's key.
    if (!published) return json({ error: "Extraction attempt is no longer active" }, 409);
    await capture("extraction_completed", found.owner?.clerkId ?? String(itemId), {
      item_id: itemId,
      video_id: found.item.videoId,
    });
    return json({ ready: true });
  }),
});

// POST /internal/extract-failed  { itemId, error, detail?, retryable }
http.route({
  path: "/internal/extract-failed",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!internalAuthorized(request)) return json({ error: "Unauthorized" }, 401);
    const body = await readBody<{
      itemId?: string;
      error?: string;
      detail?: string;
      retryable?: boolean;
      attempt?: string;
    }>(request);
    if (!body?.itemId) return json({ error: "itemId is required" }, 400);

    const message = String(body.error ?? "Extraction failed");
    const detail = body.detail ? `${message}: ${String(body.detail)}` : message;
    await ctx.runMutation(internal.items.retryOrFail, {
      itemId: body.itemId as Id<"items">,
      detail: detail.slice(0, 500),
      retryable: body.retryable === true,
      attempt: typeof body.attempt === "string" ? body.attempt : undefined,
    });
    const found = await ctx
      .runQuery(internal.items.itemWithFeed, { itemId: body.itemId as Id<"items"> })
      .catch(() => null);
    await capture("extraction_failed", found?.owner?.clerkId ?? body.itemId, {
      item_id: body.itemId,
      reason: detail.slice(0, 200),
    });
    return json({ failed: true });
  }),
});

// POST /internal/extract-heartbeat  { itemId, phase, elapsedSeconds? }
http.route({
  path: "/internal/extract-heartbeat",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!internalAuthorized(request)) return json({ error: "Unauthorized" }, 401);
    const body = await readBody<{
      itemId?: string;
      phase?: string;
      elapsedSeconds?: number;
      attempt?: string;
    }>(request);
    if (!body?.itemId) return json({ error: "itemId is required" }, 400);
    const itemId = body.itemId as Id<"items">;

    const item = await ctx.runQuery(internal.items.get, { itemId }).catch(() => null);
    if (!item) return json({ error: "Item not found" }, 404);
    if (!["extracting", "uploading"].includes(item.status)) {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }
    if (item.attemptToken && body.attempt !== item.attemptToken) {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }

    // The item is already loaded above, so its kind picks the wording for
    // free: article audio is narrated, not downloaded. Articles report an
    // extra "synthesizing" phase between fetching the page and uploading.
    const phase =
      body.phase === "downloading"
        ? item.kind === "article"
          ? "Fetching the article"
          : "Downloading and converting audio"
        : body.phase === "synthesizing"
          ? "Turning the article into audio"
          : body.phase === "uploading"
            ? "Uploading MP3"
            : body.phase === "finalizing"
              ? "Finalizing MP3"
              : undefined;
    await ctx.runMutation(internal.items.recordHeartbeat, {
      itemId,
      attempt: typeof body.attempt === "string" ? body.attempt : undefined,
      status:
        body.phase === "uploading" || body.phase === "finalizing" ? "uploading" : "extracting",
      phase,
    });
    return json({ alive: true });
  }),
});

export default http;
