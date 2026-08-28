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

Deploy the shared development environment with:

```sh
bun run deploy:dev
```

This builds with `.env.local`, disables PostHog, and updates
`earferry.earferry.workers.dev`. Pull requests from this repository receive a
preview at `pr-<number>-earferry.earferry.workers.dev`, backed by development
Clerk and an isolated `pr-<number>` Convex preview deployment. Pushes to `main`
use production Clerk and Convex and deploy to `earferry.com` through GitHub
Actions.

## Stack

- React 19 + TypeScript + Tailwind 4 (Vite, Bun)
- Convex (backend), Clerk (auth + billing)
- Cloudflare: Workers static assets (frontend), Containers (shared extractor),
  R2 (`earferry-media` — extracted MP3s and squared episode artwork)
