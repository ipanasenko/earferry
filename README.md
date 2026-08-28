# earferry

YouTube for your ears, delivered to your podcast app. Save any YouTube video
and earferry ferries the audio into a private podcast feed you can play
anywhere.

Public multi-user version of the private "listen-later" project. See
`docs/ARCHITECTURE.md` for the stack and design decisions.

## Development

```sh
bun install
bunx convex dev   # backend (Convex dev deployment)
bun run dev       # frontend (Vite)
```

Environment variables live in `.env.local` (Clerk keys via `clerk env pull`,
Convex URL via `bunx convex dev`).

## Access

EarFerry is free and invite-only, and is not for sale — see
`docs/research/billing-options.md` for why. Clerk runs in `waitlist` sign-up
mode, so `/join` collects emails and accounts are created only when an entry is
approved in the Clerk dashboard. Approve people there; there is no admin UI and
no entitlement check in the app.

```sh
clerk config patch --instance prod --json '{"auth_access_control":{"sign_up_mode":"waitlist"}}'
```

## Stack

- React 19 + TypeScript + Tailwind 4 (Vite, Bun)
- Convex (backend), Clerk (auth + waitlist)
- Cloudflare: Workers static assets (frontend), Containers (shared extractor),
  R2 (`earferry-media` — extracted MP3s and squared episode artwork)
