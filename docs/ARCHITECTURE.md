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
- Hosting: frontend as Cloudflare static assets. Production runs in the
  `ipanasenko` Cloudflare account alongside the `earferry.com` zone while the
  registrar transfer lock is active. The shared development Worker and PR
  preview aliases run in the `earferry` account. Convex Cloud hosts separate
  development and production backends.

## Environments and deployment

| Environment | Frontend | Clerk | Convex | PostHog |
| --- | --- | --- | --- | --- |
| Local | Vite localhost | Development | Development | Disabled when unset |
| Shared development | `earferry.earferry.workers.dev` | Development | Development | Disabled |
| PR preview | `pr-<number>-earferry.earferry.workers.dev` | Development | Preview `pr-<number>` | Disabled |
| Production | `earferry.com` / `www.earferry.com` | Production | Production | Production |

`bun run deploy:dev` updates the shared development Worker from `.env.local`.
GitHub Actions uploads PR versions with a stable `pr-<number>` preview alias;
those versions are not promoted to shared-development traffic. Only pushes to
`main` deploy Convex production and the custom-domain Worker. Preview builds
from forks are skipped because GitHub does not expose deployment secrets to
fork workflows.

Each pull request gets its own Convex preview deployment, created by
`convex deploy --preview-name pr-<number>` with the `CONVEX_PREVIEW_DEPLOY_KEY`
secret. Preview backends have separate functions, schema, data and schedules, so
concurrent PRs cannot overwrite each other and a frontend preview always matches
the backend it was built against. `scripts/preview-build.sh` derives the
matching `.convex.site` origin and passes it to the Worker as `CONVEX_SITE_URL`,
so `/feed/*` proxies to the same backend.

Preview backends inherit the project's Convex preview default environment
variables, which hold only `CLERK_JWT_ISSUER_DOMAIN` (development Clerk).
`EXTRACTOR_URL`, `INTERNAL_SECRET`, `MEDIA_BASE_URL` and `POSTHOG_KEY` are
deliberately unset there: a preview can exercise auth, UI, schema, queries and
mutations, but cannot enqueue real extraction work or emit analytics. Convex
removes unused preview deployments automatically, so closing a PR needs no
cleanup step.

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

- `api.items.list()` — current user's items, with waiting premieres/live videos
  first and newest position first within each group.
- `api.items.add({ url })` — validate + enqueue; re-adding a video bumps it to top.
- `api.items.remove({ id })`
- `api.items.retry({ id })`
- `api.users.me()` — `{ feedUrl }` with the user's tokenized feed URL.

Item statuses: `queued | probing | waiting | extracting | uploading | ready | failed`.
UI groups them as: Ready (green), Extracting (blue, covers queued/probing/
extracting/uploading, shows live phase text), Waiting (amber, premieres/live),
Failed (red, with retry).

Waiting items stay at the top of the visible playlist. When one finishes
extraction, its position is promoted atomically so it is emitted first in the
podcast feed as soon as it becomes ready.

## Saving a link

Three entry points, one landing strip. All of them arrive at `/?add=<url>`:

- The add form on the queue.
- The bookmarklet in the header, for a desktop browser sitting on a YouTube page.
- `GET /share`, the Android share sheet, through `share_target` in
  `public/manifest.webmanifest`. Chrome only offers an *installed* PWA in the
  share sheet, and Android's share system has no URL extra, so the link arrives
  inside the `text` field (occasionally `title`) as free prose;
  `src/lib/shareUrl.ts` picks the YouTube URL out of it. A share that carries no
  YouTube link stops on `/share` and says so, rather than reaching the queue,
  where nothing would explain the silence.

`useCaptureAddParam` (`src/lib/pendingAdd.ts`) moves the link out of the address
bar and into session storage during render, and the queue claims it once someone
is signed in. The URL is not a safe place to hold it: a share can land signed
out, and signing in with an OAuth provider leaves the page and comes back at an
address of Clerk's choosing, without the query string. While the link waits, the
landing page says so — a silent share is indistinguishable from a dropped one.

This replaced a sideloaded APK (removed 2026-08-29, last at commit `a876fc5`):
a share activity that opened `earferry.com/?add=<url>` in the default browser
and nothing else. The share target does the same from the installed PWA, and
drops a signing key, a release asset and a versionCode counter from CI. The
trade is reach: share targets are Chromium-only, so Firefox Android no longer
has an entry, and the PWA has to be installed before Chrome will offer it.

## Feed & media

A feed is what a podcast app subscribes to and what items belong to. Every user
owns exactly one private feed; the public demo showroom is a feed with no owner,
which is why it needs no account. Both are rows in `feeds`, and `items.feedId`
points at either shape.

- `GET /feed/{feedToken}` (Convex HTTP action) — RSS with episode notes from the
  YouTube description, timestamped lines as chapters.
- `GET /feed/{slug}` — the same handler. A public feed publishes its slug and
  its own branding instead of its token, and answers with a short shared cache.
  A public feed marked `permanent` never gives its episodes an `expiresAt`, so
  the showroom enclosures cannot go dead; `internal.feeds.seedSampleFeed` fills
  it and a daily cron re-verifies each MP3 is still in R2.
- `GET /media/{feedToken}/{itemId}.mp3?s={sig}` — served by the
  earferry-extractor Worker directly from R2 (byte-range support). Convex signs
  and stores the URL on the item when it becomes ready.

RSS episode `pubDate` uses the time the item became ready, so delayed or
scheduled videos sort alongside their actual availability in podcast clients.
Legacy items without that timestamp fall back to their original `addedAt`.

## Conventions

- Pre-commit (lefthook) normalizes any private Wix registry URLs out of
  `bun.lock`.
- Search: there is no SEO strategy, on purpose. `index.html` holds the static
  Open Graph card (unfurlers do not run JS), `src/lib/meta.ts` sets per-route
  title, description and canonical, `public/robots.txt` carries no sitemap, and
  the feed proxy answers `X-Robots-Tag: noindex`. Reconsider only for the
  sellable product in `docs/plans/sellable-product.md`.
- Design source of truth: Paper file "EarFerry" — use exact tokens/JSX from
  Paper MCP, not screenshots. Icons: Hugeicons.
