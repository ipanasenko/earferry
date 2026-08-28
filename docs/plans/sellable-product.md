# Handoff: the sellable product

Written 2026-08-28. This is a brief for a **future thread**, not a plan that has been
agreed. Nothing here has been built. Read
[`docs/research/billing-options.md`](../research/billing-options.md) first — it is the
evidence this brief rests on, and it is fully sourced.

---

## Why this exists

EarFerry as it stands cannot be sold. Not for tax reasons, not for company-registration
reasons — those turned out to be cheap to solve. The product category itself is prohibited:

- Polar auto-rejected it at signup: *"The product is a third-party content downloader ...
  That falls under prohibited downloaders, even if the feed is tokenized and private."*
- Paddle bans "streaming downloaders", Creem bans "third-party content downloaders and
  rippers", Dodo bans "unauthorized media downloads", Mollie bans services facilitating
  "unauthorized streaming", Apple guideline 5.2.3 names YouTube outright.
- YouTube's own Developer Policies give "an API service that offers mp3 files of audio that
  appeared in a video" as an example of a violation, so there is no compliant API route.
- CJEU **VCAST (C-265/16)** holds the private-copying exception does not cover "a commercial
  undertaking ... actively involving itself in the recording". The commercial element is the
  legally decisive part, which is exactly what charging adds.

EarFerry itself is going **free and invite-only** with unconditional donations. That is a
separate track and is not what this document is about.

This document is about the other question: **if you wanted a product you could actually
sell, what would it be?** The answer is not "EarFerry with YouTube removed". It is a
different product that shares a lot of machinery.

---

## The product

**A private listening queue for everything that is not already a podcast.**

One tokenised RSS feed per user, consumed by any podcast app — the same core idea and the
same delivery mechanism as EarFerry. What changes is where the audio comes from.

### Sources that clear every clause

**1. Podcast RSS pass-through.** The user subscribes to shows inside the product; the
feed's `<enclosure>` points at *the publisher's own MP3 URL*. No copy is made and nothing
is stored, so no downloader clause and no cyberlocker clause attaches.

> **Hard constraint:** it must be genuine pass-through. Re-hosting publisher audio in R2
> re-enters Creem's "remote digital file-sharing services and cyberlockers" and Payhip's
> "file hosting, file sharing or cyberlockers". This means giving up 30-day retention,
> transcoding and the unified artwork pipeline for this source type.

**2. User-uploaded audio.** No third party is involved, so nothing is "extracted". Genuinely
useful for audiobooks, lecture recordings, conference talks, voice memos, personal archives.

> **Hard constraint:** stay out of the cyberlocker category. Strict per-user isolation, no
> sharing, no public URLs, hard quotas. Stripe restricts cyberlockers; Creem and Payhip
> prohibit them. PayPal's file-sharing rule turns on content being "accessible to the public
> or the service pays uploaders" — a private feed avoids both.

**3. Creative Commons and public domain.** Internet Archive, LibriVox, Wikimedia,
CC-licensed podcasts. Clean but small: this audio is already easy to download, so there is
little friction to remove. A feature, not a product.

### What is explicitly out

- **YouTube, in any form.** Including "bring your own API key" — Apple 5.2.3 bans apps that
  "include the ability" (ability, not execution), Paddle's verb is "enable", and the LG
  Hamburg convert2mp3 judgment held that whether the service decrypts or merely reads an
  already-decrypted URL "is irrelevant for the legal assessment".
- Any other platform extraction: SoundCloud, Spotify, Instagram.
- Re-hosting third-party audio of any kind.

### Be honest about the value proposition

The research doc is blunt and the future thread should not paper over it:

> The thing that makes EarFerry worth EUR 9/month, YouTube, is precisely the thing no
> payment provider will process.

Sources 1 and 2 together give "everything you want to listen to in one private feed: your
subscriptions, your own files, open audio". That is a real product, but it competes with
every podcast client's built-in queue. **The first job of the future thread is to decide
whether it is worth building at all** — not to start building it. If the answer is that
uploads-for-audiobooks-and-lectures is the actual wedge, that is a different and possibly
better product than "podcast queue".

---

## What the existing codebase gives you

Roughly 60% carries over. The parts that die are the parts that made EarFerry EarFerry.

### Reusable close to as-is

| Piece | Notes |
|---|---|
| `convex/feed.ts` | RSS 2.0 builder, chapters, signed media URLs. The core asset. |
| `convex/users.ts` feed tokens | Per-user tokenised feed, rotation, `feedBaseUrl()`. |
| `worker/index.ts` | `/feed/*` proxy so feeds live on the app domain. |
| `users` table | Unchanged. |
| Frontend shell | Header, Footer, Queue, AddForm, QueueItem, EmptyState, LoadingState, Tooltip, icons, Paper design system and tokens. |
| Auth | Clerk, session token with `aud: convex`. Unchanged. |
| CI/CD | Cloudflare Workers, Convex deploy, PR previews (see PR #29). |

### Needs rework

| Piece | Why |
|---|---|
| `items` table | `videoId` and the `by_user_video` index are YouTube-specific. Needs a `source` discriminator (`rss` \| `upload` \| `open`) and per-source fields. Pass-through items have no `r2Key` and never enter the extraction states. |
| `itemStatus` union | `probing`/`extracting`/`waiting` are extraction concepts. Pass-through items are ready on creation; uploads need `uploading`/`transcoding`. |
| `convex/items.ts` dispatcher | Lease/retry/backoff machinery exists for a slow fallible extractor. Pass-through needs none of it. Uploads need a much simpler version. |

### Dies

| Piece | Why |
|---|---|
| `convex/extractor.ts` | The whole Worker contract. |
| `earferry-extractor` repo | yt-dlp container, Durable Object queue, R2 streaming. This is the single biggest asset being dropped, and it is worth being sure before doing so. |
| `convex/domain.ts` YouTube URL parsing | `normalizeYouTubeUrl`, `youtubeVideoId`. |
| Bookmarklet | Aimed at YouTube pages. Could be repurposed for podcast web players. |
| `docs/research/billing-options.md` positioning | New product, new copy, new name. |

### Naming

`earferry.com` and the ferry metaphor are tied to the YouTube story, and the domain is
already in use for the free invite-only service. **The sellable product needs its own name
and domain.** Do not try to run both from one brand — the whole point is that a reviewer
opening the product URL must not see a YouTube downloader.

---

## Payment path

Sources 1–3 clear every acceptable-use clause, so the whole processor market reopens.

- **Merchant of record (recommended):** Paddle, Lemon Squeezy, Creem, FastSpring. They
  handle EU VAT, which removes the OSS question entirely. Paddle explicitly states
  registration is "not required for individuals or sole traders".
- **Stripe direct:** requires a KVK number in NL. Registering an eenmanszaak costs
  EUR 85.15 and the address can be shielded unconditionally as a sole trader, so this is
  cheap if wanted — but with an MoR it is not needed for VAT reasons.
- **Not Clerk Billing**, unless you want Stripe direct: it only uses Stripe, is not a
  merchant of record, and does not handle VAT.
- **Not a mobile app with IAP**, if any YouTube path ever returns: Apple 5.2.3.

Note that once you charge online, Dutch rules require publishing your full name, physical
address, KVK number and BTW-id on the site. That is a real consideration for a solo
operator and is a reason the MoR route is more comfortable.

The Polar integration from PR #30 is dead (Polar rejected the account), but the **entitlement
shape in it is worth lifting**: subscription status mirrored into Convex by webhook and
checked server-side, rather than trusting a Clerk session claim. See `convex/billing.ts` on
the `billing/polar` branch.

---

## Decisions needed before any code

1. Is this worth building at all, given it competes with built-in podcast queues? Answer
   honestly before scoping.
2. Which source is the wedge — RSS pass-through, or uploads? They imply different
   audiences, different pricing and possibly different products.
3. Name and domain.
4. Does the `earferry-extractor` investment get archived, or does some non-YouTube use
   survive (transcoding uploads, for instance)?
5. Price point. EUR 9 was anchored on the YouTube value; this product is probably worth
   less.

## Suggested first step for the future thread

Not code. Take the two source types and write the landing page copy for each as if the
product existed. If neither reads like something a person would pay for, that is the
finding, and it cost an afternoon instead of a quarter.
