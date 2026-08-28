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

### Billing (Polar)

Billing runs on Polar as merchant of record. Sandbox and production are separate
Polar organizations, so each needs its own products, token and webhook. Create
two recurring products per organization, $9/month and $79/year; the subscribe
page reads the interval off each product's price and shows yearly first. Per
Convex deployment:

```sh
bunx convex env set POLAR_ORGANIZATION_TOKEN <organization token>
bunx convex env set POLAR_WEBHOOK_SECRET <webhook secret>
bunx convex env set POLAR_SERVER sandbox      # `production` on prod
```

The organization token needs the `products`, `subscriptions`, `customers`,
`checkouts`, `checkout_links`, `customer_portal` and `customer_sessions` scopes.
Point the Polar webhook at `<convex site url>/polar/events` and enable
`product.created`, `product.updated`, `subscription.created` and
`subscription.updated`. Products sync into Convex from those events, so the
subscribe page stays empty until the first one arrives.

## Stack

- React 19 + TypeScript + Tailwind 4 (Vite, Bun)
- Convex (backend), Clerk (auth), Polar (billing, merchant of record)
- Cloudflare: Workers static assets (frontend), Containers (shared extractor),
  R2 (`earferry-media` — extracted MP3s and squared episode artwork)
