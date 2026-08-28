# EarFerry: billing, legal and product-shape options

Research note. Written 2026-08-28. All sources are primary: official policy pages,
first-party legal texts, court rulings and government sites. Where a fact could not be
confirmed from a primary document it is marked **unverified** rather than inferred.

> **This is factual background, not legal advice.** Sections 5 and the parts of section 2
> about when a hobby becomes an onderneming are the two places where a Dutch lawyer or a
> belastingadviseur is genuinely needed before acting.

**Filing convention.** This repo has no notes/plans convention: `docs/` contained only
`ARCHITECTURE.md`. The sibling `~/Projects/listen-later` uses `docs/plans/` for
forward-looking plans, but this is research rather than a plan, so it goes at
`docs/research/billing-options.md` as a new convention.

---

## Bottom line

**The KVK problem is not the real problem.** Registering an eenmanszaak costs
[EUR 85.15 one-off](https://www.kvk.nl/inschrijven/inschrijfvergoeding/), and as a sole
trader you can shield your business address from the public Handelsregister
[unconditionally](https://www.kvk.nl/over-het-handelsregister/afschermen-van-je-bezoekadres-wat-is-mogelijk/).
That barrier is roughly one morning and the price of a postbus.

**The real problem is that the product category is prohibited essentially everywhere, and
Polar was not an outlier.** Every merchant of record checked bans it, several by name:

- Paddle: "**streaming downloaders**"
  ([AUP](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle))
- Creem: "**Third-party content downloaders and rippers that violate platform Terms of Service**"
  ([account reviews](https://docs.creem.io/merchant-of-record/account-reviews/account-reviews))
- Dodo Payments: "**unauthorized media downloads**"
  ([merchant acceptance](https://docs.dodopayments.com/miscellaneous/merchant-acceptance))
- Polar: "**Third-party content downloaders, including, but not limited to YouTube, Instagram and Snapchat**"
  ([acceptable use](https://polar.sh/docs/merchant-of-record/acceptable-use))
- Mollie: "**Media boxes or services that facilitate piracy or unauthorized streaming**"
  ([prohibited list](https://help.mollie.com/hc/en-us/articles/115000939369-Which-products-and-services-does-Mollie-not-accept))
- Apple, guideline 5.2.3: apps must not "include the ability to save, convert, or download
  media from third-party sources (e.g. Apple Music, **YouTube**, SoundCloud, Vimeo, etc.)"
  ([App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/))

There is **no compliant path through YouTube's official APIs**. Developer Policies III.E
forbids "download, import, backup, cache, or store copies of YouTube audiovisual content",
III.I forbids "separate, isolate, or modify the audio or video components", and YouTube's
own compliance guide gives, as an example of a violation, "an API service that offers mp3
files of audio that appeared in a video"
([Developer Policies](https://developers.google.com/youtube/terms/developer-policies),
[compliance guide](https://developers.google.com/youtube/terms/developer-policies-guide)).

And on EU law, the controlling case is adverse. **VCAST (C-265/16)** holds that Article
5(2)(b) precludes national law permitting "a commercial undertaking to provide private
individuals with a cloud service for the remote recording of private copies ... by actively
involving itself in the recording, without the rightholder's consent"
([judgment](http://publications.europa.eu/resource/celex/62016CJ0265)). The private copying
exception protects a user copying for themselves. It does not protect a paid service that
fetches the content on their behalf.

### Ranked recommendation

1. **Do not charge for the YouTube path publicly.** Run EarFerry free and invite-only, or
   not at all. Measured hosting cost is about **USD 6 to 7/month at 50 users** and
   **USD 50/month at 500 users** (section 4). At those numbers, "charge nothing" is an
   affordable answer, and it removes the payment-provider question, the VAT question, the
   KVK question and the commercial-purpose element that section 5 shows is legally decisive.
2. **Keep `listen-later` as the personal instance.** It already exists and the extractor
   architecture already isolates it so that a takedown of EarFerry cannot kill it
   (`~/Projects/listen-later/docs/plans/shared-extractor.md`). Private, single-user,
   non-commercial use is the strongest legal position available and is the only shape where
   Article 16c Auteurswet plausibly reaches.
3. **If you want revenue, change what the service ingests, then register.** A service built
   on podcast RSS pass-through, user-uploaded audio, and open-licensed sources is not a
   "third-party content downloader" under any of the clauses quoted above. Register an
   eenmanszaak (EUR 85.15, address shielded), sell through Paddle or Lemon Squeezy or Creem
   as merchant of record so they carry the EU VAT, and stop describing YouTube support.
   Section 3 is honest about how much of the product this removes.
4. **Open-source it as self-hosted software.** The empirical record here is much better than
   expected: across the complete `github/dmca` archive through August 2026, **no takedown has
   ever named yt-dlp, Invidious, NewPipe or Piped**. It earns nothing, though, and every
   donation platform that permits gated subscriptions carries an IP clause.
5. **Do not build a mobile app with IAP.** Apple guideline 5.2.3 names YouTube explicitly and
   requires you to produce authorisation on request. This is the single most specific rule
   Apple has, and it is aimed exactly at this product.

### Three things that surprised me or contradict the working assumptions

- **The repo's current billing choice is a Stripe wrapper, not an alternative to Stripe.**
  `docs/ARCHITECTURE.md` specifies Clerk Billing. Clerk's own docs say "Clerk Billing only
  uses Stripe for payment processing", answer "No, Clerk does not provide this service" to
  "Is Clerk a Merchant of Record (MoR) for transactions?", and state "Clerk Billing does not
  currently support tax or VAT"
  ([Clerk Billing overview](https://clerk.com/docs/guides/billing/overview)). Fee is 0.7% on
  top of Stripe's 2.9% + $0.30 ([clerk.com/billing](https://clerk.com/billing)). So the
  current design inherits the Stripe KVK requirement **and** leaves all EU VAT on you.
- **KVK address privacy is fully solved for an eenmanszaak, and only for an eenmanszaak.**
  "Bij een eenmanszaak kan dat altijd. Bij andere bedrijven of organisaties kan dat alleen als
  gevaar dreigt." A bv would have to prove danger; a sole trader does not.
- **The competitor is a registered US company.** PodQueue's terms say "we are referring to
  **PodQueue, LLC**" ([terms](https://podqueue.fm/pages/terms)) and its privacy policy names
  Stripe as processor. It is not an unregistered individual doing this, which removes most of
  the "if they can, I can" force from the comparison.

---

## 1. Which payment providers would actually accept this product?

### 1a. Merchants of record (they are the legal seller, so they screen the product)

| Provider | Prohibits it? | Decisive quote | Individual in NL without KVK? |
|---|---|---|---|
| **Polar** | Yes, by name | "Third-party content downloaders, including, but not limited to YouTube, Instagram and Snapchat" | Moot, already auto-rejected |
| **Paddle** | **Yes, by name** | see below | **Yes**: "this step is not required for individuals or sole traders" |
| **Creem** | **Yes, by name** | "Third-party content downloaders and rippers that violate platform Terms of Service" | Terms require only "legal age ... (if a natural person)"; entity not required |
| **Dodo Payments** | **Yes** | "unauthorized media downloads"; "tools that provide access to third-party streaming content" | unverified |
| **Lemon Squeezy** | No downloader clause; broad IP clause | "Products or content for which you do not hold a proper license or intellectual property rights" | unverified |
| **FastSpring** | No downloader clause; anti-piracy policy | "The use of a product beyond the terms of its license"; "FastSpring reserves the right to decide what it considers 'piracy.'" | unverified |
| **Gumroad** | No downloader clause; broad IP clause | "copyrighted media and software which includes unauthorized copies of books, music, movies, software ..." | **Yes**, explicit |
| **Patreon** | Yes, adjacent | "access to piracy software" | **Yes**, 18+, no entity |

**Paddle** is the sharpest. Its acceptable use policy
([current URL](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle),
last updated 13 April 2026; the old `/legal/acceptable-use-policy` URL now 404s) prohibits:

> Any product or service that infringes upon, or enables the infringement upon **copyrights,
> trademarks, terms and conditions, or trade secrets** of another party, including but not
> limited to: resale of any product without a valid reseller certificate; Illicit streaming
> services; **streaming downloaders**; content copying and IPTV

Note "**or terms and conditions**". That reaches YouTube's ToS independently of any copyright
question, which is exactly the argument in section 5 that is hardest to escape.

Paddle is a reseller: "You appoint Paddle as your non-exclusive reseller of the Product across
all territories" ([MSA](https://www.paddle.com/legal/terms)), and it says plainly, "Because
Paddle operates in this way, we carefully monitor the quality of the products we are
reselling"
([legal relationship](https://www.paddle.com/help/start/intro-to-paddle/the-legal-relationship-between-paddle-and-you)).
It would take the seller and refuse the product.

**Creem** is a merchant of record: "Creem shall act as the merchant of record and contractual
reseller of the Product, executing the resale transaction with the Buyer in his own name"
([merchant terms](https://www.creem.io/terms) §3.2). Its prohibited list also bans "Remote
digital file-sharing services and cyberlockers", which is worth noting because it would also
catch a naive user-upload pivot.

**Gumroad** is the least targeted of the MoRs and the friendliest on entity. Its payout
settings doc says: "Choose 'Individual' if you operate under your name (effectively as a sole
proprietor) or **do not have business registration documents**"
([payout settings](https://gumroad.com/help/article/260-your-payout-settings-page)). But
Gumroad is still merchant of record ("You acknowledge and agree that Gumroad is the merchant
of record for the resale of your Products", [ToS](https://gumroad.com/terms) §6.1), its
[prohibited list](https://gumroad.com/prohibited) (last revised 2 August 2026) covers
"copyrighted media and software", and it warns it "may change abruptly and without notice.
Changes to this list take effect immediately." Its KYC runs on Stripe underneath in any case.

**Lemon Squeezy is now Stripe-owned.** Its own blog says "When Stripe acquired Lemon Squeezy
last year..." ([2026 update](https://www.lemonsqueezy.com/blog/2026-update)) and the
contracting entity is "Sold through Link, LLC f/k/a Lemon Squeezy LLC"
([terms](https://www.lemonsqueezy.com/terms)). Signups are open and the Netherlands is
supported (verified: `app.lemonsqueezy.com/register` renders with NL in the country list).
The `lemonsqueezy.com/acceptable-use` URL is dead; the live list is in
[docs](https://docs.lemonsqueezy.com/help/getting-started/prohibited-products). No downloader
clause, but "Lemon Squeezy reviews every store to run KYC & KYB checks ... and that the
products you're selling are aligned with our terms & acceptable use policies".

### 1b. Payment processors (you are the merchant, so screening is lighter but you carry everything)

**Stripe direct.** [Restricted businesses](https://stripe.com/legal/restricted-businesses)
(last updated 2026-05-13) has **no "content downloader" clause**. The two that bite are, under
Prohibited Businesses:

> Sales or distribution of music, films, software or any other licensed materials without
> appropriate authorisation

> Any other products or services that directly infringe or facilitate infringement upon the
> trademark, patent, copyright, trade secrets, proprietary or privacy rights of any third party

and, under Restricted Businesses (pre-approval required, may be refused), a dedicated
"Cyberlockers / Cyberlocker and file-sharing services" heading. The
[SSA](https://stripe.com/en-nl/legal/ssa) binds these: users must not "use the Services to
conduct a Prohibited or Restricted Business ... unless Stripe has pre-approved the respective
Prohibited or Restricted Business in writing." Stripe never becomes the seller; you do. NL
onboarding requiring KVK is taken as established and was not re-verified.

**Mollie.** Two independent blockers. On product, the
[prohibited list](https://help.mollie.com/hc/en-us/articles/115000939369-Which-products-and-services-does-Mollie-not-accept)
(updated 2026-07-24) bans "Media boxes or services that facilitate piracy or unauthorized
streaming" and "Copyright, trademark, or privacy infringement". On entity, the
[user agreement](https://www.mollie.com/legal/user-agreement) Art. 2.1 is categorical:

> Mollie's services are available only to legal entities and legal constructs (organisations)
> acting in a business capacity, and explicitly not to individuals who wish to receive payments
> in the personal, family or household sphere.

and registration requires the "registration number with the Chamber of Commerce (or local
equivalent)". Mollie documents unregistered-sole-trader alternatives for Germany and the UK
only; there is **no NL carve-out** and a help-centre search for "eenmanszaak" returns nothing.
Mollie is a technical service provider, not a merchant of record (Art. 3.1).

**Adyen.** [Restricted and prohibited list](https://www.adyen.com/legal/list-restricted-prohibited)
(updated 13 Nov 2025) marks "Products designed to circumvent copyright protection techniques
or to otherwise facilitate the unlicensed use of copyrighted material" as **P** (prohibited),
and "High-risk cyber lockers" as **P**. There is no self-serve onboarding at all:
[signup](https://www.adyen.com/signup) routes you to sales. A published minimum processing
volume is **unverified**; `docs.adyen.com/get-started-with-adyen/application-requirements`
now 404s.

**PayPal.** The only mainstream processor here that clearly onboards an unincorporated
individual. The NL
[user agreement](https://www.paypal.com/nl/legalhub/paypal/useragreement-full?locale.x=en) says:

> Business accounts are for people and organisations (**whether incorporated or not**) that
> primarily use PayPal to receive online payments for sales or donations.

and subscriptions require a Business account. The exposure is the
[AUP](https://www.paypal.com/nl/legalhub/paypal/acceptableuse-full) (NL version last updated
17 July 2023), prohibited activities, limb (h):

> items that infringe or violate any copyright, trademark, right of publicity or privacy or
> any other proprietary right under the laws of any jurisdiction

The separate pre-approval item 13, "File-Sharing", is defined narrowly as services "where
uploaded content is accessible to the public or the service pays uploaders for content", and a
private per-user tokenised feed arguably sits outside it. Clause (h) is the live risk, not
item 13.

**Caveat, flagged as unverified:** the User Agreement text permits unincorporated business
accounts, but PayPal's onboarding flow asks for a "business registration number and date of
registry"
([how-to guide](https://www.paypal.com/c2/webapps/mpp/how-to-guides/sign-up-business-account)).
I could not find an NL-specific page confirming that field is optional. Worth testing before
relying on it.

**Clerk Billing (what the repo currently uses).** Not an independent option. Clerk's docs:
"Clerk Billing only uses Stripe for payment processing"; on merchant of record, "No, Clerk does
not provide this service"; and "Clerk Billing does not currently support tax or VAT, but these
are planned for future releases"
([overview](https://clerk.com/docs/guides/billing/overview)). Pricing is 0.7% plus Stripe's
2.9% + $0.30 ([clerk.com/billing](https://clerk.com/billing)). Clerk's own
[standard terms](https://clerk.com/legal/standard-terms) contain no product-type screening
beyond lawful use, so the gate is entirely Stripe's.

### 1c. Creator and donation platforms

| Platform | Who is the seller? | Individual NL, no KVK? | Gated subscription allowed? | Clause that bites |
|---|---|---|---|---|
| **Ko-fi** | You are | Yes (18+) | Yes, Memberships | Content Guidelines §3.11 "facilitate infringement"; and it imports PayPal's and Stripe's lists wholesale |
| **Buy Me a Coffee** | You are | Yes, NL supported | Yes, memberships | "IPTV subscriptions or **unauthorized streaming services**"; "Any product ... you didn't create or don't have rights to sell" |
| **Patreon** | Patreon, in substance | Yes, 18+ | Yes, core product | "access to piracy software" |
| **GitHub Sponsors** | Neither; Stripe processes | Yes, NL supported | **Yes** | "Fraud, ransom, **violations of intellectual property**, or other illegal purposes" |
| **Liberapay** | Non-profit intermediary | Yes | **No, donations only** | none specific |

**Ko-fi is not an escape hatch.** Its [terms](https://more.ko-fi.com/terms) (effective 13 July
2026) prohibit "Anything prohibited by the payment providers connected to the service such as
PayPal Inc and Stripe", linking both lists directly, and state "We are not the seller of any
Creator Content ... We are not a payment provider." It re-imposes the same rules and leaves
you as merchant of record.

**Buy Me a Coffee has the most on-the-nose language** of any platform screened.
[Prohibited content](https://help.buymeacoffee.com/en/articles/3364212-prohibited-and-restricted-content-on-buy-me-a-coffee)
bans "IPTV subscriptions or unauthorized streaming services" and "Any product - digital or
physical - you didn't create or don't have rights to sell". Payouts run through Stripe Connect,
so Stripe's NL requirements apply anyway, and VAT is explicitly yours.

**Patreon has the best structural fit and an explicit prohibition.** It is effectively merchant
of record ("Patreon is the billing entity that is associated with this charge") and, uniquely
here, remits your EU VAT: "We will use the benefit categories that you assign to your
membership or offering to calculate, collect, and remit the applicable taxes"
([terms](https://www.patreon.com/policy/legal), updated 27 May 2026). But its
[community guidelines](https://www.patreon.com/policy/guidelines) prohibit offering fans
"tutorials for engaging in illegal activities (e.g. theft, hacking, piracy), ... or **access to
piracy software**." Whether a SaaS is even a permitted benefit is **unverified**: the
[commerce guidelines](https://www.patreon.com/policy/benefits) have no software or licensing
category at all.

**GitHub Sponsors permits paid subscriptions**, which was not obvious. Its
[additional terms](https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms)
define a "Subscription" as "a recurring or one-time Sponsorship **in exchange for goods,
services, or other offers** a Sponsored Developer provides to Sponsors", and add "You are
responsible for determining the nature, content, and capabilities of your Subscription offer."
GitHub is neither merchant of record nor processor: "GitHub acts solely as a technical platform
connecting Sponsors with Sponsored Developers"; Stripe does the money. NL is supported and no
entity is required. The IP-violation clause still applies, and the eligibility framing is
"anyone who contributes to an open source project", which fits option 4 of the recommendation
much better than a closed-source SaaS.

**Liberapay is categorically out.** Its [terms](https://en.liberapay.com/about/legal) §1: "The
user agrees not to use the service for financial transactions that are not donations, notably
those linked to the execution of a contract or a **promise of recompense**." A EUR 9/month
subscription that unlocks a working service is a promise of recompense. You cannot gate
anything behind it.

### 1d. Apple App Store and Google Play

**Apple: a near-certain rejection, and the most specific rule anywhere.**
[Guideline 5.2.3](https://developer.apple.com/app-store/review/guidelines/):

> **5.2.3 Audio/Video Downloading:** Apps should not facilitate illegal file sharing or include
> the ability to save, convert, or download media from third-party sources (e.g. Apple Music,
> YouTube, SoundCloud, Vimeo, etc.) without explicit authorization from those sources. Streaming
> of audio/video content may also violate Terms of Use, so be sure to check before your app
> accesses those services. **Authorization must be provided upon request.**

5.2.2 is an independent second basis: "If your app uses, accesses, monetizes access to, or
displays content from a third-party service, ensure that you are specifically permitted to do so
under the service's terms of use." Section 5.2 states YouTube's ToS forbids it (section 5 below),
so no authorisation exists to provide.

3.1.1 forces IAP for "access to premium content, or unlocking a full version". Apple's
commission is 15% under the
[Small Business Program](https://developer.apple.com/app-store/small-business-program/) and 30%
standard (Schedule 2 §3.4(a) of the Developer Program License Agreement, dropping to 15% on
auto-renewing subscriptions after a year). Membership is
[USD 99/year](https://developer.apple.com/programs/enroll/).

On entity: an individual **can** enrol. "If you're an individual or sole proprietor/single
person business, you'll need an Apple Account with two-factor authentication turned on"; a
D-U-N-S number is required only for organisations. But two privacy costs follow. "Your name will
be displayed as the seller name of your apps on the App Store." And under the EU Digital Services
Act, Apple must "verify and display trader contact information for all traders distributing apps
on the App Store in the European Union (EU). This includes an address, phone number, and email
address ... Apple will publish this information on your App Store product page"
([DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)).
Since 17 February 2025, "apps without trader status will be removed from the App Store in the
European Union" ([Apple developer news](https://developer.apple.com/news/?id=einwn76m)). The DSA
definition covers "any **natural person**", so an unregistered individual can declare trader
status. The practical consequence is that your home address goes on a public product page.

**Google: a probable rejection on softer wording.** The operative clause is in the
[Intellectual Property policy](https://support.google.com/googleplay/android-developer/answer/9888072),
under "Encouraging Infringement of Copyright", examples of common violations:

> Streaming apps that allow users to download a local copy of copyrighted content without
> authorization.

**Correction to the brief's premise:** current Google Play policy contains **no YouTube-specific
clause**. Any wording naming YouTube or "third party sources" is **unverified** and does not
appear on the live pages. Google's Device and Network Abuse policy is about executable code
("an app may not download executable code (such as dex, JAR, .so files) from a source other than
Google Play"), not media, so it does not apply.

Registration is a
[USD 25 one-off](https://support.google.com/googleplay/android-developer/answer/6112435) and a
Personal account needs no D-U-N-S, but "If you decide to monetize on Google Play then Google will
display your **full address**"
([account creation](https://support.google.com/googleplay/android-developer/answer/13628312)), and
personal accounts created after 13 November 2023 must "run a closed test for their app with a
minimum of 12 testers who have been opted in continuously for at least 14 days" before production
access ([testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)).
For EEA transactions from 30 June 2026 the fee is roughly 10% plus a 5% billing fee at this scale
([service fees](https://support.google.com/googleplay/android-developer/answer/112622)). No DSA
trader declaration exists on Play; whether Google's identity verification is its Art. 30/31
mechanism is **unverified**.

### 1e. Who requires a registered business

| Requires registration | Accepts an individual/sole trader in NL |
|---|---|
| Mollie (KVK number mandatory at signup) | Paddle ("not required for individuals or sole traders") |
| Adyen (sales-gated, enterprise onboarding) | Gumroad (explicit "Individual" account type) |
| Stripe direct in NL (established) | PayPal Business (per user agreement; onboarding flow **unverified**) |
| Clerk Billing (inherits Stripe) | Patreon, Ko-fi, Buy Me a Coffee, GitHub Sponsors, Liberapay |
| | Apple (individual enrolment), Google (Personal account) |
| | Creem, FastSpring, Lemon Squeezy: contemplate individuals, **unverified** for NL without KVK |

---

## 2. What registering an eenmanszaak actually costs and obliges

### Fee, process, documents

[KVK inschrijfvergoeding](https://www.kvk.nl/inschrijven/inschrijfvergoeding/) (page updated
11 June 2026):

> Voor de inschrijving van een nieuwe onderneming of organisatie in het Handelsregister betaal je
> een eenmalige inschrijfvergoeding van **EUR 85,15**. Deze inschrijfvergoeding is voor
> ondernemers fiscaal aftrekbaar.

(One-off EUR 85.15, tax-deductible, indexed annually to inflation. Invoiced by email; cash is not
accepted.)

**DigiD yes, in-person appointment yes, fully online no.**
[KVK](https://www.kvk.nl/hulp-en-contact/hulp-bij-inschrijven/): "Log in met je DigiD en vul het
formulier volledig in. ... Maak dan online een afspraak op een KVK-kantoor naar keuze om je
inschrijving definitief te maken."
[business.gov.nl](https://business.gov.nl/starting-your-business/registering-your-business/registration-at-the-netherlands-chamber-of-commerce-kvk/)
puts it bluntly: "To finalise your registration you must visit a KVK office in person.
Registration is not possible without an appointment. Bring a valid proof of identity with you."

The online form takes about 15 minutes; you register in the week before or after starting
activities; the KVK number is issued at the appointment; the BTW-id arrives from the
Belastingdienst "binnen twee weken". For a home-based business at your own address, no lease
document is needed.

### Address privacy: solvable, with one condition

Default is bad. [KVK privacy FAQ](https://www.kvk.nl/over-kvk/veelgestelde-vragen-over-privacy-en-het-handelsregister/):

> Het bezoekadres moet volgens de wet openbaar zijn. **Ook als het bezoekadres een woonadres is.**

(The visiting address must by law be public, even when it is a home address.) Your *woonadres* as
such is always shielded, but that protection is worthless when the same address is registered as
the *bezoekadres*.

The fix, from
[KVK on shielding the bezoekadres](https://www.kvk.nl/over-het-handelsregister/afschermen-van-je-bezoekadres-wat-is-mogelijk/)
(page updated 15 April 2026):

> Wil je dat het bezoekadres van je bedrijf of organisatie niet te zien is in het Handelsregister?
> **Bij een eenmanszaak kan dat altijd.** Bij andere bedrijven of organisaties kan dat alleen als
> gevaar dreigt.

> Moet je de eenmanszaak nog inschrijven? Dan kun je **'afschermen bezoekadres' aanvinken bij het
> inschrijven**.

No threat, no justification, no evidence. Tick the box during initial registration. The condition:

> Laat je het bezoekadres ... afschermen? **Dan moet je altijd een postadres vastleggen in het
> Handelsregister. Dat adres is wel openbaar en kan dus niet hetzelfde zijn als het bezoekadres.**

A PO box is explicitly acceptable: "Als je geen ander adres hebt moet je een postadres regelen,
bijvoorbeeld een postbus" ([adres wijzigen](https://www.kvk.nl/wijzigen/adres-wijzigen/)). Adding
or changing an address is free.

Once shielded, "Alleen medewerkers van bestuursorganisaties, advocaten, notarissen, deurwaarders
en medewerkers van een Wwft-partij kunnen je adres nog zien", with permission. Two documented
downsides: the postadres is what propagates to the **VIES register**, and banks or insurers may
demand extra address proof. The pre-shielding bezoekadres stays visible "in de historie".

**Practical sequence: arrange the postbus before the KVK appointment**, so the home address is
never publicly indexed even briefly.

**Unverified:** the commencement date of the universal eenmanszaak shielding rule. The only
reachable KVK press release ([12 April 2022](https://www.kvk.nl/pers/kvk-meer-mogelijkheden-voor-afscherming-in-handelsregister/))
describes only the older threat-based expansion. The current rule is confirmed; its start date is not.

### Does Dutch law require registration for this activity?

[KVK's three criteria](https://www.kvk.nl/starten/moet-ik-mijn-bedrijf-inschrijven-bij-kvk/)
(page updated 4 August 2026):

> - Je levert zelfstandig producten of diensten, of je bent je hierop aan het voorbereiden.
> - Je vraagt een prijs of tarief waarmee je geld verdient. Het gaat dus niet om een hobby die je
>   alleen maar geld kost.
> - Je levert regelmatig producten of diensten aan anderen dan alleen familie of vrienden.
>
> Voldoe je aan alle drie de regels? Dan schrijf je je als ondernemer in bij KVK.

**There is no monetary threshold.** The test is purely qualitative. KVK's own worked examples are
close to the case: Kaitlen has a part-time job, bakes in her spare time, increasingly sells to
strangers, advertises on social media, and must register. Jeroen opens a webshop and must register
"ook al heeft hij er nog geen [klanten]". A publicly marketed EUR 9/month SaaS maps onto those, not
onto the hobby example.

Non-registration when you meet the criteria is not merely a formality: "Dit is strafbaar op basis
van de **Wet Economische Delicten**. Je kunt een geldboete, taakstraf of gevangenisstraf krijgen."

There is a separate, decisive point the brief did not ask about. Under Dutch e-commerce and
business-correspondence rules, once you sell online you must publish on the website "your full
registered name ... the address details of your physical address ... your contact details ... your
Business Register number (KVK-nummer) and VAT identification number"
([business.gov.nl, rules for business correspondence](https://business.gov.nl/regulations/rules-business-correspondence/)).
So "charge money but do not register" is not a stable position: the disclosure duty exposes it.

### Income tax vs VAT: two different tests

For **income tax**, the Belastingdienst applies eight criteria (profit and its size,
independence, capital, time invested, who your clients are, external marketing, entrepreneurial
risk, liability for debts) and states: "Deelname aan het economisch verkeer wil zeggen dat u tegen
vergoeding activiteiten verricht buiten de privésfeer"
([wanneer bent u ondernemer voor de inkomstenbelasting](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/wanneer_bent_u_ondernemer_voor_de_inkomstenbelasting/)).

For **VAT** the bar is lower: "U bent ondernemer als u zelfstandig werkzaamheden uitvoert en daar
inkomsten uit hebt" and "Het maakt niet uit of u winst of verlies maakt". Having a full-time job
is listed as a positive indicator, not a disqualifier
([ondernemer voor de btw](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/hoe_werkt_de_btw/voor_wie_geldt_de_btw/ondernemer)).
Explicitly: "Als u voor de inkomstenbelasting geen ondernemer bent, kunt u toch ondernemer zijn
voor de btw."

**Yes, you can be a VAT entrepreneur without KVK registration.** There is a
[registratiedrempel voor kleine ondernemers](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/hoe_werkt_de_btw/kleineondernemersregeling/registratiedrempel-voor-kleine-ondernemers)
for turnover up to EUR 2,200, but it is explicitly unavailable if you are obliged to register with
KVK: "Bent u verplicht uw onderneming in te schrijven bij KVK? ... Dan kunt u geen gebruik maken
van deze registratiedrempel, ook niet wanneer uw omzet lager is dan EUR 2.200." So it does not
help a service that meets KVK's criteria.

If you are **not** an onderneming, the income is "resultaat uit overig werk", and the official
2026 handbook lists among ROW categories "uit werkzaamheden via internet, bijvoorbeeld
**opbrengsten uit apps** of handel op internet"
([Fiscale informatie 2026, ch. 5](https://www.belastingdienst.nl/wps/wcm/connect/fisin/fisin2026/inkomsten_uit_overig_werk)).
ROW is taxed like profit but without zelfstandigenaftrek or investeringsaftrek, and attracts an
income-dependent Zvw contribution. A pure hobby (structurally loss-making) is not declarable at all.

The zelfstandigenaftrek is largely out of reach anyway: the
[urencriterium](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/winst/inkomstenbelasting/inkomstenbelasting_voor_ondernemers/voorwaarden_urencriterium)
requires 1,225 hours and "U moet **meer tijd besteden aan uw onderneming dan aan andere
werkzaamheden, bijvoorbeeld in loondienst**", though the second condition is waived in the first
starter window. It is EUR 1,200 in 2026 (down from EUR 2,470 in 2025), so this matters less than
it used to.

### VAT on digital services to EU consumers

A SaaS subscription is an electronically supplied service. Place of supply is the customer's
country: Article 58 of the
[VAT Directive](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006L0112-20250101)
puts it at "the place where that person is established, has his permanent address or usually
resides".

Article 59c gives the relief: the destination rule does not apply where the supplier is
established in one member state only and "the total value, exclusive of VAT, of the supplies ...
does not in the current calendar year exceed **EUR 10 000**", nor did it in the preceding year.
Below that, the Belastingdienst says "mag u Nederlandse btw rekenen"; above it, "berekent u meteen
al de buitenlandse btw"
([diensten aan particulieren binnen EU](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/zakendoen_met_het_buitenland/afstandsverkopen-zoals-e-commerce-en-diensten-voor-particulieren-in-andere-eu-landen/diensten-aan-particulieren-binnen-eu/)).
The EUR 10,000 is an EU-wide aggregate, counts cross-border EU B2C only (Dutch domestic and
non-EU sales do not count), and can be waived voluntarily.

Dutch rate for SaaS: **21%**. It is not in the
[9% list](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/tarieven_en_vrijstellingen/diensten_9_btw/),
so the general rate applies.

Non-EU consumers (US, etc.): **no Dutch VAT**, by Article 58. They do not count toward EUR 10,000
either. US state-level sales tax on SaaS is a real issue and is outside any Dutch primary source:
**unverified**.

### KOR and EU-KOR

The national [KOR](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/hoe_werkt_de_btw/kleineondernemersregeling/kleineondernemersregeling)
applies below EUR 20,000 turnover per calendar year: "U berekent geen btw aan uw klanten. U draagt
dus ook geen btw af." You also cannot reclaim input VAT. The old three-year lock-in is gone; you
can deregister at any time, effective the next quarter. You need a btw-nummer first.

**Does the national KOR cover cross-border digital services? Effectively no.** The Dutch KOR is a
Dutch VAT exemption. Below EUR 10,000 your EU digital sales are Dutch-taxed under Art. 59c, so they
sit inside its scope. Above it, place of supply moves abroad and the Dutch KOR does not reach them.
The Belastingdienst confirms the underlying principle on the sister page ("Omzet die belast is in
het buitenland telt niet mee voor de omzetgrens") but **I could not find a sentence stating this
conclusion in so many words. Marked unverified**; it follows from the place-of-supply rule plus the
existence of the EU-KOR as the designated remedy.

**The EU-KOR is the answer at this scale, and it is new.**
[Belastingdienst on the EU-KOR](https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/kleineondernemersregeling-in-de-europese-unie-eu-kor):

> **Sinds 1 januari 2025** is het voor ondernemers die zakendoen in andere EU-landen mogelijk om
> deel te nemen aan de kleineondernemersregeling in de EU (EU-KOR)

> Uw omzet in de hele EU in een kalenderjaar mag niet hoger zijn dan **EUR 100.000**

> Elk EU-land bepaalt zelf de nationale omzetgrens

Conditions: established in NL, under each destination country's own national threshold, total EU
turnover at or below EUR 100,000, and not in the Invoerregeling. You then charge no VAT in the
participating countries, deduct none, and file no returns there, even past EUR 10,000. The cost is
a quarterly opgaaf kwartaalomzet. Registration is via Mijn Belastingdienst Zakelijk and
**presupposes an existing Dutch VAT number**
([aanmelden](https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/aanmelden-voor-de-eu-kor)).
You get a participation number with the suffix `EX`.

### OSS

Once past EUR 10,000 without the EU-KOR, you have exactly two options:

> Met de **Unieregeling** van het eenloketsysteem doet u in 1 melding per kwartaal btw-aangifte
> over al uw diensten binnen de EU. ... **U bent niet verplicht om de Unieregeling te gebruiken.**
> Kiest u ervoor om zelf btw-aangifte te doen in het buitenland, dan **moet u zich registreren in
> elk EU-land** waar u btw over uw diensten aan particulieren verschuldigd bent.

For a EUR 9/month consumer product, registering in every member state is not realistic, so OSS is
effectively mandatory in practice. Registration: Mijn Belastingdienst Zakelijk, btw, E-commerce,
Registratie. Quarterly returns.

**Does OSS require a KVK number or RSIN?** The stated prerequisite is a btw-identificatienummer,
not a KVK number, and an eenmanszaak is not issued an RSIN at all (RSIN goes to legal forms with
legal personality and to partnerships, per
[business.gov.nl](https://business.gov.nl/starting-your-business/registering-your-business/lei-rsin-vat-and-kvk-number-which-is-which/)),
so RSIN cannot be a precondition. Whether the Belastingdienst would grant OSS on a VAT number held
**without** KVK registration is **unverified** and is the one question worth a call to the
Belastingtelefoon (0800 0543).

---

## 3. Product changes that would clear the acceptable-use problem

### 3a. YouTube official APIs: no compliant path exists

This was checked exhaustively and the answer is unambiguous.

[Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
(last updated 2026-06-24), §III.E, Audiovisual Content:

> You and your API Clients must not, and must not encourage, enable, or require others to:
> - **download, import, backup, cache, or store copies of YouTube audiovisual content without
>   YouTube's prior written approval**,
> - **make content available for offline playback**, or
> - use any aspect of the YouTube API Services to facilitate or promote copyright infringement or
>   the exploitation of copyright-infringing materials.

§III.I, Additional Prohibitions:

> - **separate, isolate, or modify the audio or video components of any YouTube audiovisual
>   content** ...
> - **promote separately the audio or video components** ...
> - ... **use any technology other than YouTube API Services to access or retrieve API Data,
>   including to access any portion of any YouTube audiovisual content** ...

That last bullet also closes the "just do not use the API" workaround: it binds you as an API
developer regardless of which pipe carries the media.

§III.G prohibits "sell, purchase, lease, lend, convey, redistribute, or sublicense all or any
portion of YouTube API Services, including YouTube audiovisual content", and §III.F: "API Clients
must not charge users to watch content in an embedded YouTube player."

Metadata caching is capped at 30 days. There is **no** permitted caching window for the media
itself.

And YouTube's own compliance guide
([Complying with the YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies-guide),
last updated 2026-05-04) gives, as a prohibited example:

> Using YouTube's API to separate or isolate video or audio components from a video. **This might
> include an API service that offers mp3 files of audio that appeared in a video** and promotes
> themselves in this context.

That is EarFerry described in one sentence, in YouTube's own words.

**Correction to the brief's framing:** the audio-separation, caching, offline and player clauses
are **not** in the
[API Services Terms of Service](https://developers.google.com/youtube/terms/api-services-terms-of-service).
They are all in the Developer Policies, which the ToS incorporates by reference (§2.1). Also,
"YouTube audiovisual content" is used throughout but is **never defined** in either document's
definitions section.

**No licensing programme exists.** The Content ID API is partner-restricted rights management, "not
accessible to all developers" ([partner docs](https://developers.google.com/youtube/partner)), and
grants no extraction rights. No YouTube programme licenses audio extraction to a third party. The
only escape valve in the text is the discretionary "without YouTube's prior written approval",
which YouTube "may deny or grant ... at our discretion" (API ToS §25.10). Whether it has ever been
granted is **unverified**; partner agreements are not published.

**YouTube's podcast RSS runs one way only, inbound.** YouTube ingests third-party podcast feeds
("you can upload your RSS feed to YouTube ... YouTube will create videos for each podcast episode")
but states explicitly, "**YouTube will not: Distribute your podcast to other platforms. Your podcast
will only be available on YouTube and YouTube Music**"
([deliver podcasts using an RSS feed](https://support.google.com/youtube/answer/13525207)). So a
"YouTube podcasts only" mode does not become compliant. The clean version is to read the
podcaster's original feed at source and bypass YouTube entirely, which is a different product.

### 3b. What would not be a "third-party content downloader"

Ranked by how well they survive the clauses in section 1 and how much of the product survives.

**1. Podcast RSS pass-through. Clears every clause. Guts most of the value.**
If the feed's `<enclosure>` points at the publisher's own MP3 URL, no copy is made, nothing is
stored, and there is nothing to "download" or "rip". None of the quoted clauses attach: not
Paddle's "streaming downloaders", not Creem's "downloaders and rippers", not Stripe's cyberlocker
category, not Apple 5.2.3. **But**: if you instead re-host the publisher's audio in your R2 bucket,
you are making a copy and you re-enter Creem's "Remote digital file-sharing services and
cyberlockers" and Payhip's "File hosting, file sharing or cyberlockers"
([Payhip terms](https://payhip.com/terms)). The compliance-preserving version is pure
pass-through, which means giving up the 30-day retention, the transcoding, and the unified
artwork pipeline. It also competes with every podcast client's own queue feature, so the product
value is thin.

**2. User-uploaded audio. Clears the downloader clauses, walks straight into the cyberlocker
clauses.** No third-party service is involved, so nothing "extracts" anything. But you are then
running storage for user-supplied files, and Stripe restricts "Cyberlocker and file-sharing
services", Creem prohibits them outright, and Payhip prohibits "File hosting, file sharing or
cyberlockers". PayPal's file-sharing pre-approval is narrower and turns on content being "accessible
to the public or the service pays uploaders", which a private feed avoids. The mitigations that
keep you out of the cyberlocker category are strict per-user isolation, no sharing, no public
URLs, and hard quotas. This is genuinely useful for audiobooks, lecture recordings and personal
archives, but it is a different product with a different audience.

**3. Creative Commons and public domain sources. Clean, and small.** Openly licensed audio from
Internet Archive, LibriVox, Wikimedia and CC-licensed podcasts can be fetched and re-hosted
lawfully, and no downloader clause attaches because the rights are granted. The catch is that
almost nobody has this problem: openly licensed audio is already downloadable, and there is
little friction to remove. As a feature it is a rounding error; as the whole product it has no
market. (I did not verify Internet Archive's programmatic-access terms: the terms URL returned no
usable content. **Unverified.**)

**4. BYO extraction backend. Does not change your position.** This is the most tempting option and
the weakest. Three independent reasons:

- Apple 5.2.3 bans apps that "**include the ability** to save, convert, or download media from
  third-party sources". Ability, not execution. Whose key runs the extraction is irrelevant.
- Polar's list bans "Services designed to circumvent other platforms' rules"
  ([acceptable use](https://polar.sh/docs/merchant-of-record/acceptable-use)) and Creem's targets
  "downloaders and rippers **that violate platform Terms of Service**". Both are aimed at the
  design intent, not the execution topology.
- Paddle bans products that "enable the infringement upon copyrights, trademarks, **terms and
  conditions**, or trade secrets of another party". Enabling is the operative verb.

Legally it is also weak: the LG Hamburg convert2mp3 judgment held the operator liable "as
accomplice, alongside the respective user of the service", and held that whether the service
itself decrypts or merely reads an already-decrypted URL "is irrelevant for the legal assessment"
(section 5). Moving the last hop to the user's own key does not move the liability.

**What actually survives.** Options 1 and 2 together produce a credible product ("everything you
want to listen to, in one private feed: your podcast subscriptions, your own files, open audio"),
and that product is sellable through Paddle, Lemon Squeezy, Creem or Stripe direct. It is not
EarFerry. The thing that makes EarFerry worth EUR 9/month, YouTube, is precisely the thing no
payment provider will process.

---

## 4. Non-payment and alternative models

### 4a. Private, personal use only

`listen-later` already exists, and the extractor architecture already anticipated this: the
shared-extractor plan explicitly chose artefact sharing over runtime sharing so that "taking
Earferry down takes extraction away from your private instance too. That is precisely the failure
the separation exists to prevent"
(`~/Projects/listen-later/docs/plans/shared-extractor.md`).

This is the strongest legal position available. It removes the commercial element that Article
16c Auteurswet excludes on its face ("zonder direct of indirect commercieel oogmerk"), removes the
"dual functionality" that VCAST found fatal (you are both the natural person and the operator), and
removes every payment-provider, VAT and KVK question at once. It also earns nothing and helps
nobody else.

### 4b. Free or invite-only public service

Cost model, computed from **522 successful extraction jobs** measured in the
`earferry-extractor` overnight runs on 2026-08-27:

| Metric (mean of 522 jobs) | Value |
|---|---|
| Wall-clock extraction time | 222.3 s |
| CPU consumed | 57.9 vCPU-s |
| Output MP3 size | 16.2 MiB |
| Source video length | 29.6 min |

The container runs on Cloudflare's `basic` instance type: 1/4 vCPU, 1 GiB memory, 4 GB disk
([instance types](https://developers.cloudflare.com/containers/platform-details/limits/)). At
published rates (memory $0.0000025/GiB-s on provisioned resources, CPU $0.000020/vCPU-s on actual
usage, disk $0.00000007/GB-s;
[Containers pricing](https://developers.cloudflare.com/containers/pricing/)) that is:

- memory 222.3 GiB-s = $0.000556
- CPU 57.9 vCPU-s = $0.001158
- disk 889.2 GB-s = $0.000062
- **about $0.0018 per extraction**

Assuming 20 saved items per user per month:

| | 50 users (1,000 jobs/mo) | 500 users (10,000 jobs/mo) |
|---|---|---|
| Container memory (25 GiB-h/mo included) | $0.33 | $5.33 |
| Container CPU (375 vCPU-min/mo included) | $0.71 | $11.13 |
| Container disk (200 GB-h/mo included) | $0.01 | $0.57 |
| R2 storage, 30-day retention, 10 GB free | $0.11 (17 GB) | $2.46 (174 GB) |
| R2 egress | $0 (["Egress ... Free"](https://developers.cloudflare.com/r2/pricing/)) | $0 |
| Workers Paid base | $5.00 | $5.00 |
| Convex | $0 (Starter) | ~$25 (Professional) |
| **Total** | **about $6 to 7/month** | **about $50/month** |

Convex figures from [convex.dev/pricing](https://www.convex.dev/pricing); Workers from
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

**The binding constraint at 500 users is throughput, not money.** `wrangler.earferry.jsonc` sets
`LANE_COUNT: 2` and `max_instances: 2`. At 222.3 s per job and two concurrent lanes the ceiling is
about 777 jobs/day. 10,000 jobs/month is 329/day average, so 42% utilisation, but peaks will queue.
Scaling lanes means more egress IPs, which the same config file notes was the fix for YouTube
bot-blocks; scaling further trades one problem for another.

Cloudflare's own terms do not restrict content type on Workers or R2. The
[developer platform service terms](https://www.cloudflare.com/service-specific-terms-developer-platform/)
say only that content "we determine in our sole judgment to be illegal, harmful, or in violation of
Section 4 ... may be blocked or removed". No non-HTML or media-volume restriction applies to
R2/Workers.

**Downsides of free.** You absorb the cost personally and forever. There is no revenue to fund a
lawyer if BREIN or a rightholder writes. Being free does **not** remove the exposure: VCAST turned
on "dual functionality", not on price, and YouTube's ToS restriction is unconditional. It does
remove the section 1 problem entirely, remove the KVK obligation (no winstoogmerk, so KVK's second
criterion fails), and remove all VAT.

### 4c. Open-sourcing it as self-hosted software

**The empirical record is much better than the policy language suggests.** From a full clone of
`github/dmca` complete through August 2026 (21,794 notice files):

| Search term | Notices |
|---|---|
| `invidious` | **0** |
| `newpipe` | **0** |
| `piped`, `TeamPiped`, `piped.video` | **0** |
| `yt-dlp` / `yt_dlp` / `ytdlp` | **1**, and GitHub marked the relevant URLs "[invalid]" |
| `youtube-dl` | 2, both from 2020 |

**Correction to the brief.** The famous RIAA takedown was dated **23 October 2020** and targeted
**youtube-dl**, not yt-dlp, and not 2022. There has never been a DMCA notice against yt-dlp on
GitHub. The notice
([github/dmca/2020/10/2020-10-23-RIAA.md](https://github.com/github/dmca/blob/master/2020/10/2020-10-23-RIAA.md))
invoked 17 U.S.C. §§1201(a)(2) and 1201(b)(1) over YouTube's "rolling cipher" and attached a
translated Hamburg Regional Court decision. GitHub reversed on 16 November 2020: the reversal notice
states "the notice does not meet the requirements of our DMCA Takedown Policy", and the
[blog post](https://github.blog/news-insights/policy-news-and-insights/standing-up-for-developers-youtube-dl-is-back/)
adds that reinstatement was "based on new information that showed the project was not circumventing
a technical protection measure (TPM)". GitHub also committed that "Every single credible 1201
takedown claim will be reviewed by technical experts" and "In the case where the claim is ambiguous,
we will err on the side of the developer", and funded a $1M Developer Defense Fund. That policy is
now codified: GitHub "will not disable a repository based on a claim of circumvention technology
without attempting to contact a repository owner to give them a chance to respond or make changes
first"
([DMCA takedown policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy)).

As of 28 August 2026, `ytdl-org/youtube-dl` (141k stars) and `yt-dlp/yt-dlp` (187k stars) are both
live, neither archived nor disabled.

**Invidious: correction.** The YouTube letter is dated **8 June 2023**, not 2024, and it is a
Terms-of-Service notice, not a DMCA notice and not a litigation threat. It cited exactly the
Developer Policy clauses quoted in section 3a and demanded compliance "within 7 days"
([iv-org/invidious#3872](https://github.com/iv-org/invidious/issues/3872)). Nothing further
happened; the maintainer closed the issue on 7 November 2023 with "Nothing happened since. Closing
for hopefully forever." The June 2024 event was a **technical** bot-block, not legal. What actually
killed public Invidious instances was IP blocking of datacenter ranges, not law.

**NewPipe: the usual story is wrong.** The 2023 incident was a DMCA notice from a French label,
"Because Music", against **Google Search**, delisting newpipe.net. It was **rescinded within six
days** ([first-party post](https://github.com/TeamNewPipe/website/blob/master/_posts/2023-07-07-newpipe-net-dmca-google-search.md),
[Lumen notice](https://lumendatabase.org/notices/34149383)). NewPipe was never removed from Google
Play because it was never on it. Any claim of a YouTube legal letter to NewPipe is **unverified**.

**Piped:** no first-party evidence of legal pressure exists. The 2022 "HTTP 451" report was
diagnosed by a maintainer as a Cloudflare misconfiguration. Claims of legal pressure are **rumour**.

**Does distributing the software trip the same policies?** Not the payment ones, because there is
nothing to sell. GitHub's
[acceptable use policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies)
prohibit content that "infringes any proprietary right of any party" or "is unlawful or promotes
unlawful activities", but the four-project record above shows the policy is not applied to
extraction tools in practice, and the 1201 review procedure is now explicitly developer-favourable.
The residual risk is Article 6(2) InfoSoc / art. 29a(3) Auteurswet, which is about *providing
services or devices*, not about running a business (section 5).

### 4d. Donations

Donation platforms do not create a clean path. Liberapay forbids anything with a "promise of
recompense", so it cannot gate a service. GitHub Sponsors permits paid subscriptions and fits the
open-source framing, but prohibits "violations of intellectual property". Patreon prohibits "access
to piracy software". Ko-fi imports PayPal's and Stripe's prohibited lists by reference. Buy Me a
Coffee prohibits "unauthorized streaming services".

The realistic donation shape is: publish the software open-source, take GitHub Sponsors or Ko-fi
donations for **the project** rather than for access to a hosted instance, and never gate anything
behind payment. The policies then bite only if someone reports the project itself, and the record in
4c suggests that has not happened to comparable projects.

---

## 5. Legal reality check (facts, not advice)

### 5a. YouTube Terms of Service

The Netherlands is served the **EEA/Switzerland** variant, effective **5 January 2022**, contracting
with Google Ireland Limited ([youtube.com/t/terms](https://www.youtube.com/t/terms)). Permissions
and Restrictions, bullet 1:

> access, reproduce, download, distribute, transmit, broadcast, display, sell, license, alter,
> modify or otherwise use any part of the Service or any Content except: (a) as specifically
> permitted by the Service; (b) with prior written permission from YouTube and, if applicable, the
> respective rights holders; or **(c) as permitted by applicable law**;

bullet 2:

> circumvent, disable, fraudulently engage, or otherwise interfere with the Service ... including
> security-related features or features that: (a) prevent or restrict the copying or other use of
> Content; or (b) limit the use of the Service or Content;

bullet 9:

> use the Service to view or listen to Content other than for personal, non-commercial use

**Two corrections to the brief's framing.** First, there is no longer a bullet saying content may
only be accessed via the streaming the Service provides. That wording is from an older version and
citing it would be wrong. Second, the **EEA text has a third exception limb, "(c) as permitted by
applicable law", which the US version (effective 15 December 2023) does not have.** That limb is the
only textual hook for a private-copying argument, and section 5c explains why it probably does not
carry the weight.

**Exceptions YouTube itself allows.** The ToS never uses the word "Premium" and grants no offline
right in the operative permissions; offline is an "as specifically permitted by the Service" feature.
The Help Centre closes the door: "**It's not possible to download audio, music, or MP3 files from
the YouTube app**", and downloaded videos "are stored encrypted on the device and **can only be
watched in the YouTube app**"
([offline FAQs](https://support.google.com/youtube/answer/7381437)). Premium offline is device-local,
encrypted, app-only, account-bound, time-limited, and explicitly excludes audio. It does not extend
to third-party tools in any respect.

### 5b. InfoSoc Directive and the thuiskopie

[Directive 2001/29/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32001L0029),
Article 5(2)(b):

> in respect of reproductions on any medium made **by a natural person** for private use and for
> ends that are **neither directly nor indirectly commercial**, on condition that the rightholders
> receive fair compensation ...

Article 5(5), the three-step test:

> The exceptions and limitations provided for in paragraphs 1, 2, 3 and 4 shall only be applied in
> certain special cases which do not conflict with a normal exploitation of the work or other
> subject-matter and do not unreasonably prejudice the legitimate interests of the rightholder.

Article 6(1) and 6(2) protect technological measures, including against "the provision of services
which ... are primarily designed, produced, adapted or performed for the purpose of enabling or
facilitating the circumvention of ... any effective technological measures". Note also the **fourth
subparagraph of Article 6(4)**: the mechanism that would otherwise let a private-copying beneficiary
demand the means to exercise the exception does **not** apply "to works or other subject-matter made
available to the public on agreed contractual terms in such a way that members of the public may
access them from a place and at a time individually chosen by them". YouTube is exactly that.

**Dutch implementation, Article 16c Auteurswet**
([wetten.overheid.nl](https://wetten.overheid.nl/BWBR0001886), version in force from 2026-01-01),
lid 1:

> Als inbreuk op het auteursrecht ... wordt niet beschouwd het reproduceren van het werk ... mits
> het reproduceren geschiedt **zonder direct of indirect commercieel oogmerk** en uitsluitend dient
> tot eigen oefening, studie of gebruik van **de natuurlijke persoon die de reproductie vervaardigt**.

(Not infringement, provided the reproduction is made without direct or indirect commercial purpose
and serves exclusively the own use of the natural person **who makes** the reproduction.)

Two points that matter a great deal here. **16c has no "or who instructs it to be made" clause.**
Article 16b(1) does have one ("of tot het verveelvoudigen uitsluitend ten behoeve van zichzelf
opdracht geeft"), and Article 16b(6) expressly excludes 16c material from 16b. So for audio, the
narrower wording is the only one available. And **16c excludes commercial purpose on its face**.

Article 29a(2) makes knowing circumvention of an effective TPM a **tort** ("handelt onrechtmatig"),
and 29a(3) extends that to anyone who "diensten verricht" that are designed to enable or facilitate
circumvention. This is a civil wrong, not a crime: the criminal provision, art. 32a Aw, is limited to
means for circumventing protection of **computer programs**.

Stichting de Thuiskopie's own statement of scope ([thuiskopie.nl](https://www.thuiskopie.nl/nl/)):

> Consumenten kunnen voor eigen gebruik en **uit legale bron** ... auteursrechtelijk beschermde
> werken kopiëren.

Thuiskopie makes no statement anywhere on its site about ripping from streaming services. The
Federatie Auteursrechtbelangen's [auteursrecht.nl FAQ](https://www.auteursrecht.nl/Kies-voor-legale-content/FAQ)
does, and grounds it in contract rather than copyright: "Legale streamingdiensten ... geven je nog
geen toestemming voor het 'rippen' van die content ... **Let op de voorwaarden van de dienst.**"

### 5c. ACI Adam limits it, but VCAST is the one that decides it

**CJEU C-435/12 ACI Adam v Stichting de Thuiskopie, 10 April 2014**
([judgment](http://publications.europa.eu/resource/celex/62012CJ0435)). Operative part:

> EU law, in particular Article 5(2)(b) ... read in conjunction with paragraph 5 of that article,
> must be interpreted as precluding national legislation ... which does not distinguish the
> situation in which the source from which a reproduction for private use is made is lawful from
> that in which that source is unlawful.

The holding is at **paragraph 41**: "Article 5(2)(b) of Directive 2001/29 must be interpreted as not
covering the case of private copies made from an unlawful source." Supporting reasoning at
paragraphs 31, 37, 38 and 39. The Hoge Raad confirmed this for Dutch law on 20 January 2017,
[ECLI:NL:HR:2017:59](https://deeplink.rechtspraak.nl/uitspraak?id=ECLI:NL:HR:2017:59), para 4.1.3:
"de thuiskopieregeling niet geldt voor kopieën, vervaardigd uit ongeoorloofde bron".

**But ACI Adam is about unlawful sources, and a video uploaded to YouTube with the rightholder's
authorisation is a lawful source.** ACI Adam alone does not resolve ripping from an authorised
upload. The case that does is:

**CJEU C-265/16 VCAST v RTI, 29 November 2017**
([judgment](http://publications.europa.eu/resource/celex/62016CJ0265)). Operative part in full:

> Directive 2001/29/EC ... in particular Article 5(2)(b) thereof, must be interpreted as precluding
> national legislation which permits **a commercial undertaking to provide private individuals with
> a cloud service for the remote recording of private copies of works protected by copyright, by
> means of a computer system, by actively involving itself in the recording, without the
> rightholder's consent.**

The reasoning is precisely on point. Para 35 confirms that third-party assistance is not
automatically fatal: "They may also have copying services provided by a third party". Para 37 then
identifies the distinction: "the provider of that service does not merely organise the reproduction,
but also **provides access** to the programmes". Para 38 names it: the service "has a **dual
functionality**, consisting in ensuring both the reproduction and the making available". Para 52:
"such a remote recording service **cannot fall within the scope of Article 5(2)(b)**".

**CJEU C-433/20 Austro-Mechana v Strato, 24 March 2022**
([judgment](http://publications.europa.eu/resource/celex/62020CJ0433)) confirms the line from the
other side: passive cloud storage a user fills himself **is** inside Article 5(2)(b), and at para
23, "Article 5(2)(b) ... may also apply to reproductions made by a natural person with the aid of a
device which belongs to a third party". At para 31 the Court itself distinguishes VCAST as concerning
"a service with a dual functionality".

**The distinguishing feature is who fetches the content.** EarFerry fetches. That places it on the
VCAST side of the line, not the Austro-Mechana side, and it does so regardless of whether the source
upload was lawful.

### 5d. The 2020 RIAA / youtube-dl takedown, and the 2017 youtube-mp3.org case

Covered factually in section 4c for the GitHub outcome. On the substance:

RIAA's legal theory, verbatim from the
[notice](https://github.com/github/dmca/blob/master/2020/10/2020-10-23-RIAA.md):

> The source code is a technology primarily designed or produced for the purpose of, and marketed
> for, circumventing a technological measure that effectively controls access to copyrighted sound
> recordings on YouTube ... please see the attached court decision from the **Hamburg Regional
> Court** that describes the technological measure at issue (known as YouTube's "**rolling
> cipher**"), and the court's determination that the technology employed by YouTube is an effective
> technical measure within the meaning of EU and German law

**That attached German judgment is the single most directly relevant document for a
Netherlands-based operator**, because it applies the German transposition of the same InfoSoc
Article 6 that art. 29a Aw transposes. LG Hamburg, Civil Chamber 8, file no. **308 O 230/17**, oral
hearing 18 July 2017, Sony Music Entertainment Germany v. the operator of **convert2mp3.net**
([certified translation](https://github.com/github/dmca/blob/master/2020/10/2020-10-23-RIAA-court-order.pdf)).
Two holdings matter:

> The Defendants' service makes it possible for users to create permanent duplication pieces from
> streamed data. In respect of the question of whether the Defendants' software in dispute performs
> the deciphering itself ... or whether it only captures the Klar-URL, which is already deciphered
> ... **is irrelevant for the legal assessment.**

> The Defendants are also capable of being sued. They are liable for the circumvention ... **as
> accomplice, alongside the respective user of the service.**

It is a preliminary injunction, not a final merits ruling. But it is why the "BYO backend" idea in
section 3b does not work as a liability shield.

**EFF's counter-argument**, in its
[15 November 2020 letter](https://github.com/github/dmca/blob/master/2020/11/2020-11-16-RIAA-reversal-effletter.pdf):

> youtube-dl contains no password, key, or other secret knowledge that is required to access YouTube
> videos. It simply uses the same mechanism that YouTube presents to each and every user who views a
> video.

> To borrow an analogy from literature, travelers come upon a door that has writing in a foreign
> language. When translated, the writing says "say 'friend' and enter." ... **YouTube presents
> instructions on accessing video streams to everyone who comes asking for it.**

GitHub accepted this as a matter of platform policy. **A US federal court did not.** In *Yout, LLC v.
RIAA*, No. 3:20-cv-1602 (D. Conn.), 30 September 2022, Judge Underhill dismissed with prejudice
([GovInfo copy](https://www.govinfo.gov/content/pkg/USCOURTS-ctd-3_20-cv-01602/pdf/USCOURTS-ctd-3_20-cv-01602-0.pdf)):

> Without modifying the signature value, there is no access to the downloadable file. ... I infer
> from the allegations that the "signature value" must constitute an access control.

> Yout's technology clearly "bypasses" YouTube's technological measures because it affirmatively acts
> to "modify[]" the Request URL (a.k.a. signature value), causing an end user to access content that
> is otherwise unavailable. ... I cannot agree with Yout that there is "nothing to circumvent."

**The Second Circuit appeal (No. 22-2760) was argued 5 February 2024 and is still undecided as of
28 August 2026** ([docket](https://www.courtlistener.com/docket/66697744/yout-llc-v-recording-industry-association-of-america-inc/)).
Verified three ways: the Second Circuit decisions database returns no match for "Yout" or 22-2760,
GovInfo has no opinion package, and the docket runs from argument through October 2025 supplemental
briefing to 31 March 2026 Rule 28(j) letters with no opinion entry. So the only US judicial holding
on whether YouTube's signature mechanism is a §1201 TPM is a district court decision under appeal.

**youtube-mp3.org, with corrections.** The case is *UMG Recordings, Inc. v. **PMD Technologie UG***
(singular, not "Technologies"), No. 2:16-cv-07210-AB-E (C.D. Cal.), filed 26 September 2016,
terminated 5 September 2017
([docket](https://www.courtlistener.com/docket/4492855/umg-recordings-inc-v-pmd-technologie-ug/)).
**RIAA is not a party**; fifteen record labels are. The
[complaint](https://storage.courtlistener.com/recap/gov.uscourts.cacd.659119.1.0.pdf) pleaded direct,
contributory and vicarious infringement, inducement, and §1201 circumvention.

The
[Final Judgment and Permanent Injunction](https://storage.courtlistener.com/recap/gov.uscourts.cacd.659119.24.0.pdf)
was entered on a **stipulation**, and its broadest clause is a lifetime, worldwide,
technology-category ban not limited to these plaintiffs' works:

> d. knowingly designing, developing, offering, or operating **any technology or service that allows
> or facilitates the practice commonly known as "streamripping,"** ... **regardless of where such
> activity is conducted**;

Plus transfer of the domain within 24 hours and a **confidential** settlement payment. Any figure in
press coverage is **unverified**. Critically: **there was never an answer, a contested motion, or a
merits ruling.** No court decided whether stream-ripping violates §1201 in that case, and the
judgment binds only those defendants.

### 5e. The Dutch enforcement record is quiet, and BREIN said one relevant thing

Across all 696 published BREIN news posts and its annual reports, **BREIN has never published an
enforcement action against a stream-ripping service and has never named one**. The single relevant
statement is a conditional, from
["BREIN overview 2016 and preview 2017"](https://stichtingbrein.nl/brein-overview-2016-and-preview-2017/),
3 February 2017:

> This concerns both streaming and downloading and in case of music it progressively concerns 'stream
> ripping' of YouTube specifically. **BREIN will take action if stream ripping services would choose
> the Netherlands as home-base.**

That sentence is aimed squarely at a Netherlands-based operator. It is a stated intention, not an
action taken.

BREIN's published position on users is framed entirely around source legality
([wat mag niet](https://stichtingbrein.nl/wat-mag-niet/)): "alleen content die legaal aangeboden is,
mag worden gedownload of gestreamd". **Nowhere does BREIN state that ripping from an authorised
source is infringing.** Its instrument of choice is the settlement: 58 schikkingen and 2 ex parte
orders in 2025 ([annual report 2025](https://stichtingbrein.nl/wp-content/uploads/2026/05/BREIN-jaarverslag-2025.pdf)),
where "Een schikking bestaat uit een onthoudingsverklaring met contractuele boete en een
tegemoetkoming in de kosten en eventueel schade." A 2023 example against an individual who merely
wrote and rented scripts settled at EUR 10,500 plus a EUR 500/day penalty clause capped at EUR 50,000
([BREIN](https://stichtingbrein.nl/wegduikende-scripter-van-twaalftal-torrentsites-alsnog-het-haasje/)).

**No published Dutch judgment on stream-ripping exists.** Searches of
[uitspraken.rechtspraak.nl](https://uitspraken.rechtspraak.nl) for "stream ripping", streamripping,
streamripper, "YouTube converter", ytmp3, flvto, savefrom and related terms returned nothing
relevant. Two caveats that cut the other way: rechtspraak.nl publishes only a selection, and **ex
parte orders under art. 1019e Rv are as a rule not published at all**, which is exactly the
instrument BREIN uses. "No published ruling" is not "no order ever issued". **Unverified in both
directions.**

The European Commission's
[Counterfeit and Piracy Watch List, SWD(2025) 132 final](https://ec.europa.eu/transparency/documents-register/api/files/SWD(2025)132_0/de00000001071956?rendition=false)
has a dedicated §3.2.2 on stream-ripping services and names Ytmp3, Y2mate, YT1s, 9convert, X2mate,
Savefrom, Flvto and 2conv, with blocking orders from Denmark, India, Italy, Spain and Brazil. **The
Netherlands appears nowhere in that section.**

### 5f. Where a Dutch lawyer is needed

1. Whether art. 16c Aw can reach a copy made **by a service** for a user, given the absence of the
   "opdracht geeft" clause that art. 16b has, and given VCAST. This is the central question and it
   is not answerable from the texts alone.
2. Whether YouTube's signature mechanism is an "effective technical measure" under art. 29a(1) Aw.
   LG Hamburg said yes on a preliminary basis; EFF says no; the Second Circuit has not ruled after
   two and a half years.
3. Whether running the service, paid or free, engages art. 29a(3) Aw as "diensten verricht" designed
   to facilitate circumvention, and what the exposure is given BREIN's settlement practice.
4. Whether the EEA ToS limb "(c) as permitted by applicable law" does any work, or whether the
   contract restriction stands independently of copyright.
5. Whether OSS or EU-KOR registration is obtainable on a VAT number held without KVK registration
   (this one is for the Belastingtelefoon, not a lawyer).

---

## 6. Decision table

| Option | Viable? | Effort | Ongoing obligations | Shutdown risk | Preserves usefulness |
|---|---|---|---|---|---|
| **Keep private (`listen-later` only)** | Yes | Zero, it exists | None | Very low. Non-commercial, single user, no dual functionality | For you: fully. For anyone else: none |
| **EarFerry free, invite-only** | Yes | Low. Remove Clerk Billing | ~$6-7/mo at 50 users, ~$50/mo at 500. Throughput ceiling ~777 jobs/day at 2 lanes | Low-moderate. No KVK trigger (no winstoogmerk), no payment provider to be rejected by. YouTube ToS and art. 29a exposure remain | **Fully** |
| **Paid, YouTube source, any MoR** | **No** | n/a | n/a | Certain rejection at onboarding: Paddle, Creem, Dodo, Polar all name it | n/a |
| **Paid, YouTube source, Stripe direct or PayPal** | Technically possible, policy-adverse | KVK registration + VAT setup | KVK EUR 85.15 + postbus; VAT at 21% or KOR/EU-KOR; quarterly filings; publish KVK + BTW-id + address on site | **High.** Stripe restricts cyberlockers and prohibits facilitating infringement; PayPal AUP (h). Account termination is the likely failure mode, mid-subscription | Fully, until it stops |
| **Paid, pivot to RSS pass-through + uploads + CC** | Yes | **High.** New ingestion, new positioning, drop YouTube from all copy | Same KVK/VAT as above; MoR carries EU VAT if you use Paddle/Creem/Lemon Squeezy | Low, if genuinely pass-through. Re-hosting third-party audio re-enters the cyberlocker clauses | **Poor.** Loses the reason anyone pays |
| **Mobile app + IAP** | **No** | n/a | Apple $99/yr, Google $25; EU trader status publishes your address | Apple 5.2.3 names YouTube and demands authorisation on request | n/a |
| **Open-source self-hosted** | Yes | Moderate. Extractor repo is currently private and intentionally so | None | **Low, empirically.** Zero DMCA notices ever against yt-dlp, Invidious, NewPipe or Piped; GitHub's post-2020 §1201 procedure is developer-favourable | Fully, for technical users only |
| **Donations (GitHub Sponsors / Ko-fi)** | Only for the open-source project | Low | None | Moderate. IP clauses on every platform; Liberapay forbids gated access outright | Does not fund a hosted service |

---

## Appendix: source index

Payment and platform policies: [Stripe](https://stripe.com/legal/restricted-businesses) ·
[Paddle](https://www.paddle.com/help/start/intro-to-paddle/what-am-i-not-allowed-to-sell-on-paddle) ·
[Lemon Squeezy](https://docs.lemonsqueezy.com/help/getting-started/prohibited-products) ·
[FastSpring](https://fastspring.com/terms-use/) · [Gumroad](https://gumroad.com/prohibited) ·
[Polar](https://polar.sh/docs/merchant-of-record/acceptable-use) ·
[Creem](https://docs.creem.io/merchant-of-record/account-reviews/account-reviews) ·
[Dodo](https://docs.dodopayments.com/miscellaneous/merchant-acceptance) ·
[Payhip](https://payhip.com/terms) ·
[Mollie](https://help.mollie.com/hc/en-us/articles/115000939369-Which-products-and-services-does-Mollie-not-accept) ·
[Adyen](https://www.adyen.com/legal/list-restricted-prohibited) ·
[PayPal AUP](https://www.paypal.com/nl/legalhub/paypal/acceptableuse-full) ·
[Ko-fi](https://help.ko-fi.com/hc/en-us/articles/360007937553-Ko-fi-Content-Guidelines) ·
[Buy Me a Coffee](https://help.buymeacoffee.com/en/articles/3364212-prohibited-and-restricted-content-on-buy-me-a-coffee) ·
[Patreon](https://www.patreon.com/policy/guidelines) ·
[GitHub Sponsors](https://docs.github.com/en/site-policy/github-terms/github-sponsors-additional-terms) ·
[Liberapay](https://en.liberapay.com/about/legal) ·
[Apple](https://developer.apple.com/app-store/review/guidelines/) ·
[Google Play IP](https://support.google.com/googleplay/android-developer/answer/9888072) ·
[Clerk Billing](https://clerk.com/docs/guides/billing/overview)

Dutch registration and tax: [KVK fee](https://www.kvk.nl/inschrijven/inschrijfvergoeding/) ·
[KVK address shielding](https://www.kvk.nl/over-het-handelsregister/afschermen-van-je-bezoekadres-wat-is-mogelijk/) ·
[KVK registration criteria](https://www.kvk.nl/starten/moet-ik-mijn-bedrijf-inschrijven-bij-kvk/) ·
[business.gov.nl KVK registration](https://business.gov.nl/starting-your-business/registering-your-business/registration-at-the-netherlands-chamber-of-commerce-kvk/) ·
[business.gov.nl website disclosure](https://business.gov.nl/regulations/rules-business-correspondence/) ·
[Belastingdienst KOR](https://www.belastingdienst.nl/wps/wcm/connect/bldcontentnl/belastingdienst/zakelijk/btw/hoe_werkt_de_btw/kleineondernemersregeling/kleineondernemersregeling) ·
[Belastingdienst EU-KOR](https://www.belastingdienst.nl/wps/wcm/connect/nl/btw/content/kleineondernemersregeling-in-de-europese-unie-eu-kor) ·
[VAT Directive consolidated](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02006L0112-20250101)

YouTube: [ToS](https://www.youtube.com/t/terms) ·
[API Services ToS](https://developers.google.com/youtube/terms/api-services-terms-of-service) ·
[Developer Policies](https://developers.google.com/youtube/terms/developer-policies) ·
[compliance guide](https://developers.google.com/youtube/terms/developer-policies-guide) ·
[podcast RSS](https://support.google.com/youtube/answer/13525207)

Law and incidents: [InfoSoc 2001/29/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32001L0029) ·
[ACI Adam C-435/12](http://publications.europa.eu/resource/celex/62012CJ0435) ·
[VCAST C-265/16](http://publications.europa.eu/resource/celex/62016CJ0265) ·
[Austro-Mechana C-433/20](http://publications.europa.eu/resource/celex/62020CJ0433) ·
[Auteurswet](https://wetten.overheid.nl/BWBR0001886) ·
[HR ECLI:NL:HR:2017:59](https://deeplink.rechtspraak.nl/uitspraak?id=ECLI:NL:HR:2017:59) ·
[RIAA notice 2020](https://github.com/github/dmca/blob/master/2020/10/2020-10-23-RIAA.md) ·
[LG Hamburg 308 O 230/17](https://github.com/github/dmca/blob/master/2020/10/2020-10-23-RIAA-court-order.pdf) ·
[EFF letter](https://github.com/github/dmca/blob/master/2020/11/2020-11-16-RIAA-reversal-effletter.pdf) ·
[GitHub reinstatement](https://github.blog/news-insights/policy-news-and-insights/standing-up-for-developers-youtube-dl-is-back/) ·
[Yout v RIAA](https://www.govinfo.gov/content/pkg/USCOURTS-ctd-3_20-cv-01602/pdf/USCOURTS-ctd-3_20-cv-01602-0.pdf) ·
[UMG v PMD judgment](https://storage.courtlistener.com/recap/gov.uscourts.cacd.659119.24.0.pdf) ·
[Invidious YouTube letter](https://github.com/iv-org/invidious/issues/3872) ·
[BREIN 2017 statement](https://stichtingbrein.nl/brein-overview-2016-and-preview-2017/) ·
[EC Watch List 2025](https://ec.europa.eu/transparency/documents-register/api/files/SWD(2025)132_0/de00000001071956?rendition=false)

Cost model: [R2 pricing](https://developers.cloudflare.com/r2/pricing/) ·
[Containers pricing](https://developers.cloudflare.com/containers/pricing/) ·
[Containers instance types](https://developers.cloudflare.com/containers/platform-details/limits/) ·
[Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) ·
[Convex pricing](https://www.convex.dev/pricing) ·
local measurement data: `~/Projects/earferry-extractor/earferry-public-*.csv` (522 successful jobs,
2026-08-27)
