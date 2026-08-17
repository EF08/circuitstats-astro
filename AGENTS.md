# Circuit Stats (circuitstats.com) — Project Brief

## What it is
A **free, fully open** web app giving coaches, scouts, recruiters, and basketball parents national stats and rankings for AAU youth basketball players (U15, U16, U17) across the three biggest U.S. circuits — UAA, EYBL, and 3SSB Platinum — for the 2026 season. **<!--PLAYERS-->3,877 unique players tracked<!--/PLAYERS-->.** This data does not exist anywhere else in a combined, searchable, rankable format.

Circuit Stats is **not the product — it is the top of the funnel.** It is given away to attract the audience (recruiting-minded parents and players) that gets converted into the paid player-website business below.

## Audience (free users) vs. buyers (paid)
Free users / traffic: AAU coaches scouting opponents, recruiters and college scouts, parents checking their kid's standing, program directors. The **buyer** is narrower: **parents of players** (and players themselves) who want their kid seen by college programs. Coaches and scouts are traffic and credibility, not revenue. Marketing and on-site CTAs are aimed at the parent segment.

## Monetization (LIVE since July 2026)
Professional player recruiting websites. List price is **$399 to build, then $39/month** hosting; a **launch offer runs the first 50 websites at $99 + $9/month**. Included copy on `/get-started`: "his own domain, highlight film, verified stats that update after every session, and a private dashboard showing which coaches opened his site and what they watched". The dashboard (visitor log, visitors over time, film watch time — like abrifazliu's) is a standard included feature as of Aug 2026.

**The launch offer is one constant.** `SEATS_TAKEN` in `src/pages/get-started.astro` drives the price, the struck-through figures, the seat bar and the heading's second line. Set it to `SEATS_TOTAL` and the whole offer folds on the next build — the page quotes $399 again with nothing else to undo. Scarcity is by count, not by clock: there is no deadline that can silently expire on a page nobody rebuilt.

**Currency is CAD.** Stripe charges CA$99 (CA$90 setup + the first CA$9 month on one invoice), then CA$9/mo. The page says "$99" unqualified and most traffic is American — a known, deliberate gap, not a bug to fix without asking.

**No free trial, ever.** A trial subscription falls under the card networks' trial rules: a mandatory pre-charge reminder, and Stripe appending `* TRIAL OVER` to the statement descriptor, which overwrites everything past the 10th character and mangles `PLAYER WEBSITE`. See `scripts/create-player-website-link.js` in the backend.

### The funnel (Aug 15 2026 — the intake wizard)
Player pages → CTA card → `/get-started` → **intake wizard** → `website_requests` + `website_intakes` + email to Andy → Stripe checkout.

The two-field form is gone; it is now **slide 1 of the wizard**, with the same two fields, so the `Lead` event fires in the same place at the same rate and the ad optimisation sees no change. Slides 2–9 collect the player; then one film slide per chosen strength; then checkout. Film uploads browser → Cloudflare R2 directly, never through the backend — a submission is 12–30 clips and 150–500MB, and a Mongo doc caps at 16MB.

- One question per screen, and **nothing scrolls**; slides are budgeted against a 320×568 phone. That rule is why eighteen screens feel shorter than one long form — don't add fields to a slide without re-checking it.
- Answers persist in `localStorage`, so the exit confirm promises the draft rather than warning it will be lost.
- **The brief is filed and emailed BEFORE Stripe opens.** An abandoned payment still leaves a complete submission with all its film, which is worth more than the $99. Never reorder this.
- `website_intakes` is deliberately separate from `website_requests` — that collection is the funnel's final stage and every dashboard number leans on its shape. They join on `requestId` / `intakeToken`.
- Clip size is capped **after** upload (`r2.js` HEADs and deletes oversized objects): an S3-style presigned PUT cannot limit a body.

Pixel: `StartIntake` (open) → `Lead` (slide 1, with advanced matching) → `InitiateCheckout` → `Purchase`. Optimize campaigns on `Lead`; read `CompleteRegistration` as lead quality.

Funnel labels changed with the wizard, and both readers were updated to union old-or-new so nothing resets to zero across the cutover: `funnel.js` (dashboard) and `pitchDropoff.js` (the `/ad-read` skill). Old labels are kept, not retired — they are the only way to read anything before Aug 15 2026.

An urgency badge on the player-page CTA and `/get-started` hero (`src/lib/liveLabel.js`) shows only during the real NCAA live periods (April and July); other months it hides entirely — don't "fix" its absence.

**`/intake` — the pipeline recapture link (Aug 17 2026).** The same wizard as `/get-started`, minus everything transactional: no pricing, no add-ons slide, no quote, no Stripe — submit files the brief, emails Andy, done. Andy sends it by hand to prospects he's already talking to. Its silence is structural, not policed: the page never defines `window.csTrack` and passes Layout's `noPixel`, so every funnel label and pixel call inside the wizard no-ops on its own guard — never add either helper to that page. Submissions carry `source: 'pipeline'` (born on the intake draft, copied server-side onto the `website_request` that closes it); `funnel.js`'s `humanLead`, `model.listWebsiteRequests` and the MCP `awaitingPayment` count all exclude it, so pipeline briefs never inflate a funnel or dashboard number. Pipeline drafts use their own localStorage key (`cs-intake-pipeline-v1`) so the two pages never share a half-filled form.

Still open: how the offer is pitched/marketed beyond the site itself, and whether sites are templated or custom-built.

## Value props (copy reference)
Scout any opponent before tip-off · recruit without traveling ("find the hidden gem") · national ranking for any player by any stat and age group · side-by-side player comparisons · see who's really carrying a team.

## Data (2026 season)
<!-- DATA-COUNTS:BEGIN — auto-generated by sync_from_index.py on every data sync; do not edit by hand -->
- UAA: U15 400, U16 372, U17 413
- EYBL: U15 602, U16 546, U17 444
- 3SSB Platinum: U15 408, U16 497, U17 470
- **4,152 player stat lines across 9 datasets · 3,877 unique players** (auto-updated 2026-08-05)
<!-- DATA-COUNTS:END -->
- Official stats from each circuit. **UAA and EYBL track all shooting stats; 3SSB Platinum does NOT publish raw FGM/FGA/FTM/FTA — only percentages.** Never compute or display raw attempt counts for 3SSB.
- Data lives in the `circuitstats-data` repo; pushing there triggers a Vercel deploy hook that rebuilds this site.

## Tech stack
- **This repo (`circuitstats-astro`) is the live site** on circuitstats.com — Astro, deployed on Vercel.
- Backend: `EF08/a1a2-command-center` (Node/Express on Render, MongoDB Atlas) — the `circuitboard` app handles website requests, funnel tracking, and visitor tracking.
- Scrapers: EYBL via Cerebro API, 3SSB via Playwright + AJAX, UAA via UA Next HTML; collectors live in `circuitstats-data`.
- **Legacy:** `EF08/circuitstats` (single-HTML-file SPA) is the old frontend, superseded by this repo. Its commented-out Stripe/magic-link/JWT paywall (and the matching backend endpoints) are deliberately preserved but dormant — don't delete, don't revive unless asked.

## Business stage
Solo founder (Andy Fazliu). Launched 2026; pivoted mid-2026 from paid SaaS to free + programmatic SEO, then added the player-website offer (July 2026). Focus: traffic/SEO into the free site and converting parents to player websites. Paywall conversion work is on hold.

---

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
