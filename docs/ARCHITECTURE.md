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
- Access: free and invite-only. There is no billing. Clerk runs in `waitlist`
  sign-up mode (`auth_access_control.sign_up_mode`), so an account only exists
  once a waitlist entry has been approved in the Clerk dashboard. Signed in
  therefore means invited, and no further entitlement check exists anywhere;
  `/join` renders Clerk's `<Waitlist />`.
  EarFerry cannot be sold: merchants of record classify it as a prohibited
  third-party content downloader (Polar rejected it outright), and CJEU VCAST
  (C-265/16) puts a commercial operator outside the private-copying exception.
  The evidence is in `docs/research/billing-options.md`; the alternative product
  that could be sold is sketched in `docs/plans/sellable-product.md`.
- Donations: an unconditional Liberapay link in the footer. Donating must never
  affect access or capacity. That is what keeps it a gift rather than a price,
  and keeps EarFerry outside KVK's "je vraagt een prijs of tarief" registration
  test. Never show it on `/join`.
- Extraction: the shared extractor container from the private repo
  (see `~/Projects/listen-later/docs/plans/shared-extractor.md`). EarFerry runs
  its own instance in the `earferry` Cloudflare account: a product-agnostic
  wrapper Worker from the private `earferry-extractor` repo (which owns the
  container source and deploys isolated instances into each product's
  Cloudflare account) wraps the container and owns the R2 bucket. Convex
  submits product items to the Worker's Durable Object execution queue; the
  container's multipart upload callbacks
  terminate in the Worker, which streams into R2 and calls back the URL in its
  per-deployment `CALLBACK_URL` var (for EarFerry: this Convex deployment's
  `/internal` HTTP actions).

- Storage: R2 bucket `earferry-media` in the earferry Cloudflare account
  (30-day lifecycle). Stores the extracted MP3s and the square episode
  artwork generated during extraction.
- Hosting: frontend as Cloudflare static assets in the earferry account;
  Convex Cloud for the backend.

## Extractor Worker contract (Convex <-> earferry-extractor Worker)

All Worker endpoints (except /media) require `Authorization: Bearer INTERNAL_SECRET`.

Convex -> Worker:
- `POST /probe` `{ url }` -> container probe result (proxied).
- `POST /extract` `{ itemId, url, attemptToken, queueOrder }` -> `202` when
  durably created or `200` when the same attempt already exists. The Durable
  Object owns FIFO ordering, leases, retries, and restart recovery; it starts a
  disposable container job with callbackBase pointing at the Worker and
  streams the result into R2 at
  `items/{itemId}.mp3` (artwork at `items/{itemId}.jpg`).
- `GET /jobs/{itemId}` -> durable execution state, used only for reconciliation.
- `DELETE /jobs/{itemId}` -> cancel + delete R2 objects.
- `GET /health` -> container health (proxied).

Worker -> Convex (HTTP actions on CONVEX_SITE_URL, same Bearer secret):
- `POST /internal/extract-complete` `{ itemId, sizeBytes, artwork,
  durationSeconds?, title?, channel?, description?, publishedAt? }`
- `POST /internal/extract-failed` `{ itemId, error, detail?, retryable }`
- `POST /internal/extract-heartbeat` `{ itemId, phase, elapsedSeconds? }`

Convex owns item and user data plus an idempotent submission outbox. It may
probe several due items concurrently and submit them all; it does not serialize
container work or retry accepted extraction attempts. Terminal outcomes are
persisted in a Durable Object outbox before delivery to Convex, so a callback
outage retries notification without downloading the media again. Production
jobs preempt the next low-priority self-test item.

Media (public, podcast clients):
- `GET /media/{feedToken}/{itemId}.mp3?s={sig}` on the Worker, byte-range
  support from R2. `sig = hex(HMAC-SHA256(INTERNAL_SECRET, feedToken + "/" +
  itemId))`. Convex builds these URLs in the RSS feed (env MEDIA_BASE_URL).
- `GET /media/{feedToken}/{itemId}.jpg?s={sig}` serves generated square
  episode artwork with the same item signature.

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
