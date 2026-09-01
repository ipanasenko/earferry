// Domain logic ported from the private listen-later project (src/domain.js).

import { ConvexError } from "convex/values";

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

export const EXTRACTION_LEASE_MS = 5 * 60 * 1_000;

export function recoveryDelay(lastHeartbeatAt: number, now = Date.now()): number {
  return Math.max(0, lastHeartbeatAt + EXTRACTION_LEASE_MS - now);
}

export function isExpiredReady(
  item: { status: string; expiresAt?: number },
  now = Date.now(),
): boolean {
  return item.status === "ready" && typeof item.expiresAt === "number" && item.expiresAt <= now;
}

export function normalizeYouTubeUrl(value: unknown): string {
  if (typeof value !== "string" || value.length > 2_048) {
    throw new ConvexError("Enter a valid YouTube URL.");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConvexError("Enter a valid YouTube URL.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (url.protocol !== "https:" || !YOUTUBE_HOSTS.has(hostname)) {
    throw new ConvexError("Only HTTPS YouTube links are supported.");
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
    throw new ConvexError("Enter a link to a single YouTube video.");
  }

  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubeVideoId(canonicalUrl: string): string {
  const id = new URL(canonicalUrl).searchParams.get("v");
  if (!id) throw new ConvexError("Enter a link to a single YouTube video.");
  return id;
}

export type ItemKind = "video" | "article";

// Tracking params are stripped before hashing so the same article shared from
// two newsletters dedupes to one item.
const TRACKING_PARAM = /^(utm_|fbclid$|gclid$)/i;

/**
 * Sorts a pasted link into the video or article lane. YouTube links keep their
 * existing normalization and dedupe key (the video id); any other https link is
 * treated as an article and deduped by a hash of its cleaned URL. The dedupe
 * key is stored in the items.videoId column either way.
 */
export function classifyUrl(value: unknown): {
  kind: ItemKind;
  canonicalUrl: string;
  dedupeKey: string;
} {
  if (typeof value !== "string" || value.length > 2_048) {
    throw new ConvexError("Enter a valid https link to a video or article.");
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ConvexError("Enter a valid https link to a video or article.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (YOUTUBE_HOSTS.has(hostname)) {
    const canonicalUrl = normalizeYouTubeUrl(value);
    return { kind: "video", canonicalUrl, dedupeKey: youtubeVideoId(canonicalUrl) };
  }

  if (url.protocol !== "https:" || !hostname.includes(".")) {
    throw new ConvexError("Enter a valid https link to a video or article.");
  }

  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) url.searchParams.delete(key);
  }
  const canonicalUrl = url.toString();
  return {
    kind: "article",
    canonicalUrl,
    dedupeKey: `a:${sha256Hex(canonicalUrl).slice(0, 32)}`,
  };
}

// Pure-JS SHA-256 (hex). classifyUrl runs inside the add mutation, where the
// Convex runtime does not expose crypto.subtle, so the hash is computed here.
export function sha256Hex(input: string): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bytes = new TextEncoder().encode(input);
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array((((bytes.length + 8) >> 6) << 6) + 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  new DataView(padded.buffer).setUint32(padded.length - 4, bitLength >>> 0);
  new DataView(padded.buffer).setUint32(padded.length - 8, Math.floor(bitLength / 2 ** 32));

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    const view = new DataView(padded.buffer, offset, 64);
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  return Array.from(H, (word) => word.toString(16).padStart(8, "0")).join("");
}

// The extractor's error text must never reach a queue card verbatim. These
// patterns must match the ones in the container image (container/server.js in
// the private repo); classification depends on the exact strings.
const ACCESS_BLOCKED =
  /not a bot|sign in to confirm|http error 40[39]\b|http error 429\b|failed to extract any player response/i;
const UNAVAILABLE_VIDEO = /private|removed|deleted|members.only|sign in|not available/i;
const ACCESS_BLOCKED_FAILURE = {
  permanent: false,
  message: "YouTube is refusing downloads right now. Trying again shortly",
} as const;
const UNAVAILABLE_VIDEO_FAILURE = {
  permanent: true,
  message: "YouTube does not share this video",
} as const;
const GENERIC_FAILURE = {
  permanent: false,
  message: "We couldn't finish extracting this video. Trying again shortly",
} as const;
// Article failures come from the reader/TTS side of the extractor rather than
// yt-dlp: a paywall or an unreadable page is permanent, anything else retries.
const ARTICLE_UNREADABLE =
  /paywall|subscriber|subscription|sign in|log ?in required|http error 40[13]\b|answered (401|403|451)\b|forbidden|no readable|could ?n.t read|not an article/i;
const ARTICLE_UNREADABLE_FAILURE = {
  permanent: true,
  message: "This article is subscriber-only or couldn't be read.",
} as const;
const ARTICLE_GENERIC_FAILURE = {
  permanent: false,
  message: "We couldn't finish narrating this article. Trying again shortly",
} as const;
const USER_FACING_FAILURES = [
  ACCESS_BLOCKED_FAILURE,
  UNAVAILABLE_VIDEO_FAILURE,
  GENERIC_FAILURE,
  ARTICLE_UNREADABLE_FAILURE,
  ARTICLE_GENERIC_FAILURE,
] as const;

export function describeFailure(
  detail: unknown,
  kind: ItemKind = "video",
): { permanent: boolean; message: string } {
  const text = String(detail ?? "");
  const existingMessage = USER_FACING_FAILURES.find(
    ({ message }) => text === message || text.startsWith(`${message}:`),
  );
  if (existingMessage) return existingMessage;
  if (kind === "article") {
    if (ARTICLE_UNREADABLE.test(text)) return ARTICLE_UNREADABLE_FAILURE;
    return ARTICLE_GENERIC_FAILURE;
  }
  if (ACCESS_BLOCKED.test(text)) return ACCESS_BLOCKED_FAILURE;
  if (UNAVAILABLE_VIDEO.test(text)) return UNAVAILABLE_VIDEO_FAILURE;
  return GENERIC_FAILURE;
}

// Retry pacing for retryable extraction failures. The cumulative waits
// (5 / 15 / 35 minutes) are sized to straddle YouTube's measured ~20-minute
// bot-check window instead of landing every attempt inside it. Jitter spreads
// simultaneous refusals so they do not all come back at the same moment.
// Mirrors lib/retry.js in the earferry-extractor repo.
export const MAX_AUTO_RETRIES = 3;
const RETRY_DELAYS_MS = [5 * 60_000, 10 * 60_000, 20 * 60_000];
const RETRY_JITTER = 0.4;

export function retryDelayMs(attempts: number, jitter = Math.random()): number {
  const step = Math.min(Math.max(attempts, 0), RETRY_DELAYS_MS.length - 1);
  const spread = 1 + (jitter - 0.5) * RETRY_JITTER;
  return Math.round(RETRY_DELAYS_MS[step] * spread);
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

export function isWaitingLiveStatus(
  status: unknown,
  releaseTimestamp?: number,
  now = Date.now(),
): boolean {
  if (status === "is_upcoming" || status === "is_live" || status === "post_live") return true;

  const scheduled = Number(releaseTimestamp) * 1_000;
  return Number.isFinite(scheduled) && scheduled > now;
}

export function waitingDescription(metadata: {
  live_status?: string;
  release_timestamp?: number;
}): string {
  if (metadata.live_status === "is_live") return "Live now: waiting for the recording";
  if (metadata.live_status === "post_live") {
    return "Live ended: waiting for YouTube to finish processing";
  }
  if (Number.isFinite(metadata.release_timestamp)) {
    const when = new Date(Number(metadata.release_timestamp) * 1_000);
    return `Scheduled for ${when.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`;
  }
  if (metadata.live_status === "is_upcoming") return "Upcoming: waiting for the video";
  return "Waiting until YouTube reports that the video is fully available";
}

export function nextCheckDelay(metadata: { release_timestamp?: number }, now = Date.now()): number {
  const scheduled = Number(metadata.release_timestamp) * 1_000;
  if (Number.isFinite(scheduled) && scheduled > now) {
    return Math.min(scheduled + 5 * 60_000 - now, 30 * 60_000);
  }
  return 5 * 60_000;
}
