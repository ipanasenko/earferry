// Proxies /feed/* from the site origin to the Convex HTTP router, so podcast
// feed URLs live on the same domain as the app instead of *.convex.site.
// Requests outside run_worker_first (wrangler.jsonc) are served as static
// assets and never reach this handler.

interface Env {
  CONVEX_SITE_URL: string;
}

const FORWARDED_REQUEST_HEADERS = ["accept", "if-modified-since", "if-none-match", "user-agent"];

export function feedRequestHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export function hardenFeedResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/feed/")) {
      return new Response("Not found", { status: 404 });
    }
    const target = new URL(url.pathname + url.search, env.CONVEX_SITE_URL);
    const response = await fetch(target, {
      method: request.method,
      headers: feedRequestHeaders(request),
      redirect: "manual",
    });
    return hardenFeedResponse(response);
  },
};
