// Server-side PostHog capture. Convex allows fetch only in actions and HTTP
// actions, so call this from those contexts only (extractor.run, http.ts).
// Fire-and-forget: analytics must never break the extraction pipeline.
export async function capture(
  event: string,
  distinctId: string,
  props: Record<string, unknown> = {},
): Promise<void> {
  const apiKey = process.env.POSTHOG_KEY;
  if (!apiKey) return;
  try {
    await fetch("https://eu.i.posthog.com/i/v0/e/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { product: "earferry", ...props },
      }),
    });
  } catch {
    // Ignore: telemetry only.
  }
}
