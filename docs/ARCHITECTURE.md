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
  its own instance in the `earferry` Cloudflare account and drives it over the
  documented HTTP contract. Convex actions call the container
  (`POST /probe`, `POST /extract`, `DELETE /jobs/:id`, `GET /health`); the
  container calls back with a multipart upload sequence
  (`POST {callbackBase}`, `PUT .../{uploadId}/{part}`, `POST .../complete`,
  `POST .../fail`, `POST .../heartbeat`).
- Storage: R2 bucket `earferry-audio` in the earferry Cloudflare account.
- Hosting: frontend as Cloudflare static assets in the earferry account;
  Convex Cloud for the backend.

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
- `GET /media/{feedToken}/{itemId}.mp3` — 302 redirect to a presigned R2 URL
  (R2 handles byte ranges). Stubbed until the extractor is wired.

## Conventions

- Pre-commit (lefthook) normalizes any private Wix registry URLs out of
  `bun.lock`.
- Design source of truth: Paper file "EarFerry" — use exact tokens/JSX from
  Paper MCP, not screenshots. Icons: Hugeicons.
