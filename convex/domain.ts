// Domain logic ported from the private listen-later project (src/domain.js).

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export function normalizeYouTubeUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2_048) {
    throw new Error("Enter a valid YouTube URL.");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid YouTube URL.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(hostname)) {
    throw new Error("Only HTTPS YouTube links are supported.");
  }

  let videoId: string | null | undefined;
  if (hostname === "youtu.be") {
    videoId = url.pathname.split("/").filter(Boolean)[0];
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  } else {
    const match = url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)/);
    videoId = match?.[1];
  }

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId ?? "")) {
    throw new Error("Enter a link to a single YouTube video.");
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeVideoId(canonicalUrl: string): string {
  const id = new URL(canonicalUrl).searchParams.get("v");
  if (!id) throw new Error("Enter a link to a single YouTube video.");
  return id;
}

// The extractor's error text must never reach a queue card verbatim. These
// patterns must match the ones in the container image (container/server.js in
// the private repo); classification depends on the exact strings.
const ACCESS_BLOCKED =
  /not a bot|sign in to confirm|http error 40[39]\b|http error 429\b|failed to extract any player response/i;
const UNAVAILABLE_VIDEO = /private|removed|deleted|members.only|sign in|not available/i;

export function describeFailure(detail: unknown): { permanent: boolean; message: string } {
  const text = String(detail ?? "");
  if (ACCESS_BLOCKED.test(text)) {
    return {
      permanent: false,
      message: "YouTube is refusing downloads right now. Trying again shortly",
    };
  }
  if (UNAVAILABLE_VIDEO.test(text)) {
    return { permanent: true, message: "YouTube does not share this video" };
  }
  return { permanent: false, message: "Extraction did not finish. Trying again shortly" };
}

export function publishedDate(metadata: {
  timestamp?: number;
  release_timestamp?: number;
  upload_date?: string;
}): number | null {
  const timestamp = metadata.timestamp ?? metadata.release_timestamp;
  if (Number.isFinite(timestamp)) return Number(timestamp) * 1_000;

  if (/^\d{8}$/.test(metadata.upload_date ?? "")) {
    const value = metadata.upload_date!;
    return Date.parse(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`);
  }
  return null;
}

export function isWaitingLiveStatus(status: unknown): boolean {
  return !["not_live", "was_live"].includes(String(status));
}
