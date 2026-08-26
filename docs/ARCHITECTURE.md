# EarFerry architecture

EarFerry is the public multi-user version of the private "listen-later" project
(`~/Projects/listen-later`). Paste a YouTube URL, EarFerry extracts the audio to
MP3 and serves it through a private tokenized RSS feed for podcast clients.

## Stack

- Frontend: React 19, TypeScript, Tailwind 4, Vite, react-router-dom. Bun as
  package manager and script runner.
- Backend: Convex (project `earferry`, dev deployment `amicable-peccary-679`).
- Auth: Clerk (app `earferry`, dev instance `loyal-man-2766.clerk.accounts.dev`),
  integrated with Convex via the `convex` JWT template.
- Billing: Clerk Billing, one plan at $9/month, no free tier. Plan slug
  `ferry` (dev instance); the auto-created `free_user` plan is hidden and
  represents the unsubscribed state. Gate app access with
  Clerk's `has({ plan: "ferry" })` / `<Protect plan="ferry">`.
- Extraction: the shared extractor container from the private repo
  (see `~/Projects/listen-later/docs/plans/shared-extractor.md`). EarFerry runs
  its own instance in the `earferry` Cloudflare account: a thin
  `earferry-extractor` Worker (source lives in the private listen-later repo,
  deployed by a workflow there — private deploy secrets must not live in this
  public repo) wraps the container and owns the R2 bucket. Convex drives the
  Worker over HTTP; the container's multipart upload callbacks terminate in the
  Worker, which streams into R2 and notifies Convex when done.

- Storage: R2 bucket `earferry-media` in the earferry Cloudflare account
  (30-day lifecycle). Stores the extracted MP3s and the square episode
  artwork generated during extraction.
- Hosting: frontend as Cloudflare static assets in the earferry account;
  Convex Cloud for the backend.

## Extractor Worker contract (Convex <-> earferry-extractor Worker)

All Worker endpoints (except /media) require `Authorization: Bearer INTERNAL_SECRET`.

Convex -> Worker:
- `POST /probe` `{ url }` -> container probe result (proxied).
- `POST /extract` `{ itemId, url }` -> 202; Worker starts a container job with
  callbackBase pointing at itself, streams the result into R2 at
  `items/{itemId}.mp3` (artwork at `items/{itemId}.jpg`).
- `DELETE /jobs/{itemId}` -> cancel + delete R2 objects.
- `GET /health` -> container health (proxied).

Worker -> Convex (HTTP actions on CONVEX_SITE_URL, same Bearer secret):
- `POST /internal/extract-complete` `{ itemId, sizeBytes, durationSeconds?,
  title?, channel?, description?, publishedAt? }`
- `POST /internal/extract-failed` `{ itemId, error, detail?, retryable }`
- `POST /internal/extract-heartbeat` `{ itemId, phase, elapsedSeconds? }`

Media (public, podcast clients):
- `GET /media/{feedToken}/{itemId}.mp3?s={sig}` on the Worker, byte-range
  support from R2. `sig = hex(HMAC-SHA256(INTERNAL_SECRET, feedToken + "/" +
  itemId))`. Convex builds these URLs in the RSS feed (env MEDIA_BASE_URL).

Convex env vars: `EXTRACTOR_URL`, `INTERNAL_SECRET`, `MEDIA_BASE_URL`,
optional `FEED_BASE_URL`.

## Convex API contract (frontend <-> backend)

- `api.items.list()` — current user's items, newest position first.
- `api.items.add({ url })` — validate + enqueue; re-adding a video bumps it to top.
- `api.items.remove({ id })`
- `api.items.retry({ id })`
- `api.users.me()` — `{ feedUrl }` with the user's tokenized feed URL.

Item statuses: `queued | probing | waiting | extracting | uploading | ready | failed`.
UI groups them as: Ready (green), Extracting (blue, covers queued/probing/
extracting/uploading, shows live phase text), Waiting (amber, premieres/live),
Failed (red, with retry).

## Feed & media

- `GET /feed/{feedToken}` (Convex HTTP action) — RSS with episode notes from the
  YouTube description, timestamped lines as chapters.
- `GET /media/{feedToken}/{itemId}.mp3?s={sig}` — served by the
  earferry-extractor Worker directly from R2 (byte-range support). Convex signs
  and stores the URL on the item when it becomes ready.

## Conventions

- Pre-commit (lefthook) normalizes any private Wix registry URLs out of
  `bun.lock`.
- Design source of truth: Paper file "EarFerry" — use exact tokens/JSX from
  Paper MCP, not screenshots. Icons: Hugeicons.
