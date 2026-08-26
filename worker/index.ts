// Proxies /feed/* from the site origin to the Convex HTTP router, so podcast
// feed URLs live on the same domain as the app instead of *.convex.site.
// Requests outside run_worker_first (wrangler.jsonc) are served as static
// assets and never reach this handler.

interface Env {
  CONVEX_SITE_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/feed/")) {
      return new Response("Not found", { status: 404 });
    }
    const target = new URL(url.pathname + url.search, env.CONVEX_SITE_URL);
    return fetch(target, {
      method: request.method,
      headers: request.headers,
      redirect: "manual",
    });
  },
};
