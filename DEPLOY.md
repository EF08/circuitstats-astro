# Circuit Stats — Astro cutover runbook

Blue-green cutover: stand this site up on a **new** Vercel project, verify, then
move the domain. The old site keeps serving until the moment you flip; rollback
is moving the domain back.

## What this repo is
Astro + `@astrojs/vercel`. Mostly static pages; two things run server-side:
`/compare/[slug]` (SSR — any player pair) and `/api/og` (edge — share-card PNGs).
`vercel.json` proxies `/a1a2-command-center/*` to Render (dashboard + tracking).

---

## Phase 2 — Staging deploy (Vercel, ~5 min)
1. Push this repo to GitHub (e.g. `EF08/circuitstats-astro`).
2. Vercel → **Add New Project** → import that repo. It auto-detects Astro
   (build runs `npm run build` = fetch data + `astro build`, no output dir to set).
   **One env var required** — the stats JSONs are fetched at build time by
   `scripts/fetch-data.mjs` from the private `EF08/circuitstats-data` repo, via either:
   - `DATA_REPO_DEPLOY_KEY_B64` — base64 ed25519 private key of a read-only deploy
     key on the data repo (**already set on this project**, Production + Preview), or
   - `DATA_REPO_TOKEN` — fine-grained GitHub PAT with read-only Contents access.
3. Deploy → note the preview URL, e.g. `https://circuitstats-astro-xxxx.vercel.app`.

## Phase 3 — Verify on the preview URL
These only work on Vercel, so check them here:
- **Share cards:** open `/<that-url>/api/og?t=h&ti=Test&s=2026&s2=hi` → should return a PNG.
  Then paste a player link into iMessage/Slack → branded preview.
- **Backend proxy:** `/dashboard` (sign in with your magic link) loads analytics;
  visits are being tracked.
- **SSR compare:** open any `/compare/<a>-vs-<b>` (curated or a random pair).
- **URL parity (the safety net):**
  ```
  python audit_urls.py --base https://circuitstats-astro-xxxx.vercel.app
  ```
  Expected: **0 broken.** (Locally the compare pairs + ts-pct show as broken —
  on Vercel the SSR route + the ts-pct→fg-pct redirect resolve them.)
- **Trailing slash / clean URLs:** confirm `/player/kellen-paul-uaa-u15`
  (no slash, no `.html`) loads and is the canonical.

## Phase 4 — Cutover (Vercel — the switch)
Move `circuitstats.com` **and** `www.circuitstats.com` from the old project to the
new one (Vercel → new project → Settings → Domains → add; it prompts to move them).
DNS already points at Vercel, so this is near-instant.

## Phase 5 — Rollback (if needed)
Move both domains back to the old project. Instant. Keep the old project ~2 weeks.

---

## Updating stats after cutover (the data bridge)
Your update workflow is unchanged: scrape → Excel → `build_site.py` →
`circuitstats/index.html`. Then, to push the update live:
```
cd circuitstats-astro
python sync_from_index.py      # pulls fresh data + slug registry from ../circuitstats/index.html
git commit -am "data update" && git push   # Vercel rebuilds & deploys
```
`sync_from_index.py` reads the exact datasets/standings/slugs that `index.html`
already contains — same source of truth, no double entry.

## Known carried-over quirk
3SSB team pages show literal `null` in makes/attempts columns (3SSB doesn't track
those; the pre-SEO app's team table rendered `null` there). Reproduced faithfully.
Say the word to change it to `—`.
