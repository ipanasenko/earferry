import { describe, expect, test } from "bun:test";
import { feedRequestHeaders, hardenFeedResponse } from "../worker";

describe("feed proxy", () => {
  test("forwards cache negotiation but strips cookies and authorization", () => {
    const request = new Request("https://earferry.com/feed/token", {
      headers: {
        accept: "application/rss+xml",
        authorization: "Bearer private",
        cookie: "session=private",
        "if-none-match": '"feed-version"',
      },
    });

    const headers = feedRequestHeaders(request);

    expect(headers.get("accept")).toBe("application/rss+xml");
    expect(headers.get("if-none-match")).toBe('"feed-version"');
    expect(headers.has("authorization")).toBe(false);
    expect(headers.has("cookie")).toBe(false);
  });

  test("adds defensive headers without changing the upstream response", async () => {
    const response = hardenFeedResponse(
      new Response("feed", { status: 200, headers: { "content-type": "application/rss+xml" } }),
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("feed");
    expect(response.headers.get("content-type")).toBe("application/rss+xml");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
  });
});
