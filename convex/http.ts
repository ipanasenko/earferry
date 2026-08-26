import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildFeed } from "./feed";

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

// GET /feed/{feedToken} — RSS 2.0 podcast feed of the user's ready items.
http.route({
  pathPrefix: "/feed/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const feedToken = decodeURIComponent(url.pathname.slice("/feed/".length)).replace(/\.xml$/, "");
    if (!feedToken) return json({ error: "Not found" }, 404);

    const user = await ctx.runQuery(internal.items.userByFeedToken, { feedToken });
    if (!user) return json({ error: "Not found" }, 404);

    const items = await ctx.runQuery(internal.items.readyItemsForUser, { userId: user._id });
    const xml = buildFeed(items, url.origin, user.feedToken);
    return new Response(xml, {
      headers: {
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "no-cache",
      },
    });
  }),
});

// GET /media/{feedToken}/{itemId}.mp3 — will 302 to a presigned R2 URL.
http.route({
  pathPrefix: "/media/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/media\/([^/]+)\/([^/]+)\.mp3$/);
    if (!match) return json({ error: "Not found" }, 404);
    const feedToken = decodeURIComponent(match[1]);

    const user = await ctx.runQuery(internal.items.userByFeedToken, { feedToken });
    if (!user) return json({ error: "Not found" }, 404);

    // TODO: once R2 is wired, verify the item belongs to this user, is ready,
    // and 302-redirect to a presigned R2 URL for item.r2Key (R2 handles byte
    // ranges). Until then media is not served.
    return json({ error: "Media is not available yet" }, 404);
  }),
});

// Extractor callback sequence. The container calls, with
// `authorization: Bearer {INTERNAL_SECRET}`, against
// callbackBase = /internal/extract-callback/{itemId}:
//   POST {base}                         begin multipart upload -> { uploadId }
//   PUT  {base}/{uploadId}/{part}       upload one part -> { etag, partNumber }
//   PUT  {base}/art                     square episode artwork
//   POST {base}/{uploadId}/complete     finish -> item becomes ready
//   POST {base}/fail                    report failure -> item becomes failed
//   POST {base}/heartbeat               liveness + phase
// R2 wiring comes later; parts are acknowledged without being stored.
const extractCallback = httpAction(async (ctx, request) => {
  if (!internalAuthorized(request)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(request.url);
  const segments = url.pathname
    .slice("/internal/extract-callback/".length)
    .split("/")
    .filter(Boolean);
  const itemId = decodeURIComponent(segments[0] ?? "") as Id<"items">;
  if (!itemId) return json({ error: "Not found" }, 404);

  const item = await ctx.runQuery(internal.items.get, { itemId }).catch(() => null);
  if (!item) return json({ error: "Item not found" }, 404);
  const rest = segments.slice(1);

  // POST {base} — begin the upload.
  if (request.method === "POST" && rest.length === 0) {
    if (!["extracting", "uploading"].includes(item.status)) {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }
    await ctx.runMutation(internal.items.setStatus, {
      itemId,
      status: "uploading",
      phase: "Uploading MP3",
    });
    // TODO: create a real R2 multipart upload and return its uploadId.
    return json({ key: `${itemId}.mp3`, uploadId: `stub-${itemId}` });
  }

  // POST {base}/heartbeat
  if (request.method === "POST" && rest[0] === "heartbeat") {
    if (!["extracting", "uploading"].includes(item.status)) {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }
    const body = (await request.json().catch(() => ({}))) as { phase?: string };
    const phase =
      body.phase === "downloading"
        ? "Downloading and converting audio"
        : body.phase === "uploading"
          ? "Uploading MP3"
          : body.phase === "finalizing"
            ? "Finalizing MP3"
            : undefined;
    if (phase) {
      await ctx.runMutation(internal.items.setStatus, {
        itemId,
        status: body.phase === "downloading" ? "extracting" : "uploading",
        phase,
      });
    }
    return json({ alive: true });
  }

  // POST {base}/fail — classify with the shared error strings.
  if (request.method === "POST" && rest[0] === "fail") {
    if (item.status === "ready") return json({ ignored: true });
    const body = (await request.json().catch(() => ({}))) as { error?: unknown };
    await ctx.runMutation(internal.items.markFailed, {
      itemId,
      detail: String(body.error ?? "Media operation failed").slice(0, 500),
    });
    return json({ failed: true });
  }

  // PUT {base}/art — episode artwork.
  if (request.method === "PUT" && rest[0] === "art") {
    if (!["extracting", "uploading"].includes(item.status)) {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }
    // TODO: store the artwork in R2 and point the item at the stored copy.
    await request.arrayBuffer().catch(() => null);
    return json({ stored: true });
  }

  // PUT {base}/{uploadId}/{part} — upload one part.
  if (request.method === "PUT" && rest.length === 2 && /^\d+$/.test(rest[1])) {
    if (item.status !== "uploading") {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }
    const partNumber = Number(rest[1]);
    // TODO: stream the body into the R2 multipart upload and return its etag.
    await request.arrayBuffer().catch(() => null);
    return json({ etag: `stub-etag-${partNumber}`, partNumber });
  }

  // POST {base}/{uploadId}/complete — finish; the item becomes ready.
  if (request.method === "POST" && rest.length === 2 && rest[1] === "complete") {
    if (item.status !== "uploading") {
      return json({ error: "Extraction attempt is no longer active" }, 409);
    }
    const body = (await request.json().catch(() => ({}))) as { size?: number };
    // TODO: complete the R2 multipart upload and verify the object size.
    await ctx.runMutation(internal.items.markReady, {
      itemId,
      r2Key: `${itemId}.mp3`,
      sizeBytes: Number(body.size) > 0 ? Number(body.size) : undefined,
    });
    return json({ ready: true });
  }

  return json({ error: "Not found" }, 404);
});

http.route({ pathPrefix: "/internal/extract-callback/", method: "POST", handler: extractCallback });
http.route({ pathPrefix: "/internal/extract-callback/", method: "PUT", handler: extractCallback });

export default http;
