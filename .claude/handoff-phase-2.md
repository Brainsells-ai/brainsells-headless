# Hand-off — Phase 2 (Homepage)

**Status:** merged on `main` as `c6c679e` via PR #5. Branch deleted.
**Vercel HITL gate:** Vercel preview deployed and reviewed before squash-merge.
**CI gate:** main fully green since `2bb8c47` (PR #8) — first time since 1.5a.

---

## What landed

Source of truth: `docs/MEGAPROMPT.md §PHASE 2`. Implementation lives in
`apps/silbe/`.

### The seven sections (under `components/home/`)

- **`Hero.tsx`** — Hybrid hero. 5/12 LEFT (caps mini-label "Editorial
  Klassiker · Wien"; Cormorant Italic H1 quote
  `clamp(2.75rem, 6vw + 1rem, 6rem)` with `„…"`; Crimson italic source
  caption with Guillemets `›Briefe an einen jungen Dichter‹ · 1903`;
  Crimson 15px tagline; primary "Editionen ansehen" + tertiary
  "Bibliothek lesen →" CTA pair) + 7/12 RIGHT (`<Image>` of
  `/mockups/rilke-geduld-hero-burgundy-scene-a.jpg` with `priority`,
  `fill`, sizes, dark gradient vignette, bottom-right Inter 9px caption
  "Goldrahmen-Edition · Atelier Wien"). Mobile stacks Quote→Image with
  CTAs in the quote section ahead of the image, per spec.
- **`TrustBar.tsx`** — Hairline-bordered band, `repeat(2, 1fr)` mobile /
  `repeat(4, 1fr)` desktop. Four canonical statements byte-identical to
  vocabulary §6 (Material / Druck / Versand / Kuration). Tiny taupe
  Inter caps mini-label above each.
- **`FuenfStimmen.tsx`** — Section header (caps mini-label + Cormorant
  Italic H2 + Crimson sub-caption naming all five) followed by `<ol>` of
  five `<li>` rows separated by hairlines. Each row: large initial
  letter (R / K / M / Z / E, `clamp(64px, 8vw, 96px)`, taupe) | full
  name H3 + `Lebensdaten · Lebensorte` mini-line + Cormorant Italic
  blockquote + Crimson source caption + per-row "Mehr erfahren →".
  Closing centered "Alle Stimmen kennenlernen →".
- **`FeaturedEditions.tsx`** — Async server component.
  `collection(handle:"featured")` via Storefront API → silent fallback
  to `BEST_SELLING`. Both paths tagged for ISR
  (`shopify:collection:featured`, `shopify:products`). Empty result →
  "In Vorbereitung" panel (no scarcity language). 4-up grid (2-up
  mobile). EUR formatting via `Intl.NumberFormat('de-DE', currency)`.
  Catches log to `console.error` on Shopify outage so Vercel logs
  capture the failure.
- **`WerkstattTeaser.tsx`** — Soft-beige band, 2-col desktop (5fr image
  | 6fr text). Image: `/werkstatt/triptych-3-olive-sprig.jpg` 7:10.
  Text: caps mini-label + Cormorant H2 "Editorial-Atelier in Wien." +
  canonical sub-headline + secondary Button "In die Werkstatt →".
  Triptych positions 1+2 still flagged for re-generation per
  `asset-mapping.md §4`; the spec's fallback path (position 3 only) is
  used.
- **`EditorialLetter.tsx`** — Reads `pages` collection slug
  `editorial-letter-homepage` via Payload local API. CRLF-tolerant
  paragraph splitter (`/(?:\r?\n)\s*(?:\r?\n)/`). Type-guarded `body`
  (`typeof === 'string'`). Falls back to inline German placeholder
  ("Warum fünf Stimmen — und nicht fünfzig.") when Payload returns
  nothing or errors.
- **`BibliothekTeaser.tsx`** — Async server component. Reads pages with
  slug-prefix `bibliothek-`. Three typographic article cards (no hero
  images per card per spec). Hairline-bordered cards, caps "Rubrik"
  label, Cormorant title, Crimson lead, "Lesen →". Default rubrik is
  `'Notiz'` (was a per-index lookup that mislabeled real Payload docs —
  caught and fixed during the simplify pass).

### Page composition (`app/(frontend)/page.tsx`)

```
Hero  →  TrustBar  →  FeaturedEditions  →  FuenfStimmen
     →  EditorialLetter  →  WerkstattTeaser  →  BibliothekTeaser
```

`revalidate = 3600`. Per-page metadata with the `og-five-klassiker-a.png`
OG card.

### Shared changes

- `app/(frontend)/globals.css` — six new responsive grid rules at the
  md (768px) breakpoint: `silbe-hero-grid` (5fr 7fr),
  `silbe-trustbar-grid` (4-up), `silbe-stimme-row` (96px 1fr),
  `silbe-featured-grid` (4-up), `silbe-werkstatt-grid` (5fr 6fr),
  `silbe-bibliothek-grid` (3-up).
- `components/layout/Footer.tsx` — wordmark variant switched from `gold`
  to `cream` per HOT 2 cream-on-charcoal direction. One-line change.
- `components/home/{Hero,FuenfStimmen,FeaturedEditions,BibliothekTeaser}.tsx` —
  closing tertiary "Alle … ansehen →" links replaced with
  `<Button variant="tertiary">` to dedupe inline styles.

### Tests

- New `tests/e2e/homepage.spec.ts` — 10 tests × 2 viewports = 20 total.
  Top-level `beforeEach(page.goto('/'))`. Covers hero hybrid layout
  (CTA pair, quote source, German typography assertions), trust bar
  (four canonical strings byte-identical), fünf stimmen (five voices
  visible, no Lasker-Schüler regression), featured editions (renders in
  either Shopify or fallback shape), and a11y (alts present, single h1,
  html lang `de-AT`, all sections reachable as landmarks).
- Removed obsolete homepage layout snapshot test from `layout.spec.ts`
  (Phase-1 holding-page baseline no longer relevant). Drawer + footer +
  redirect tests retained.

---

## Deviations from spec

- **`app/(frontend)/` instead of spec's `app/(storefront)/`.** This
  grouping was set in Phase 1.5b to pair with Payload's `(payload)`
  route group. Phase 2 keeps it stable. Phase 3 PDP route should also
  live under `(frontend)`.
- **Section ordering.** Spec listed sections in document order Hero →
  TrustBar → FuenfStimmen → FeaturedEditions → … . The shipped order
  swaps FeaturedEditions ahead of FuenfStimmen and inserts
  EditorialLetter as the editorial pivot before Werkstatt + Bibliothek.
  Reasoning: trust → product → context → essay → workshop → reading.
- **Layout snapshot test removed.** Phase 1.5a's
  `layout snapshot — homepage` baselines were captured against the
  Phase-1 holding page; Phase 2 made them stale. Re-introduce after
  Phase 2 design ships HITL.
- **Triptych fallback.** WerkstattTeaser shows position 3 only (olive
  sprig), not the full three-part triptych. Positions 1+2 are flagged
  for re-generation in `asset-mapping.md §4` (AI hands + pseudo-text).
- **Local primitives left inline.** `<CapsLabel>`, `<SectionHeading>`,
  `<EyebrowLabel>` candidates flagged in the simplify pass were not
  extracted — saved for the multi-brand `packages/ui/` pull-out.

---

## The build-pipeline incident — four-PR series

Phase 2's main work shipped in **PR #5** (`c6c679e`), but `main` had been
red since Phase 1.5b due to env-var plumbing issues. Three small hotfixes
landed as a series to unblock both Vercel and GitHub Actions CI:

| # | PR | Commit | Fixes |
|---|---|---|---|
| 1 | [#6](https://github.com/Brainsells-ai/brainsells-headless/pull/6) | `f099b61` | **Vercel build.** Turborepo wasn't passing `PAYLOAD_SECRET` etc. through to `next build` because they weren't declared in `turbo.json` `tasks.build.env`. Added six env vars (`PAYLOAD_SECRET`, `PAYLOAD_PUBLIC_SERVER_URL`, `DATABASE_URI`, three Shopify tokens). |
| 2 | [#7](https://github.com/Brainsells-ai/brainsells-headless/pull/7) | `6e283ac` | **GitHub Actions Build step.** `.github/workflows/test.yml` had no `env:` block on the `silbe` job, so the runner had no secrets in scope when `pnpm build` ran. Added a job-level `env:` block referencing the same six secrets via repo Settings → Secrets and variables → Actions. |
| 3 | [#8](https://github.com/Brainsells-ai/brainsells-headless/pull/8) | `2bb8c47` | **GitHub Actions Playwright step.** `pnpm test:e2e -- --grep-invert "@snapshot"` passed `--` literally to Playwright, which read it as a positional regex and reported "No tests found". Added a dedicated `test:e2e:non-snapshot` script in `package.json` and called it directly from the workflow. |

The env-var failures were masking each other. Each fix unmasked the next.
The Playwright `--` issue had been latent since Phase 1.5a but only became
visible once #6 + #7 cleared the env wall.

Renamed in Vercel during the incident: `AYLOAD_PUBLIC_SERVER_URL` →
`PAYLOAD_PUBLIC_SERVER_URL` (typo on the original env var name).

---

## Acceptance signals

| signal | result |
|---|---|
| Local `pnpm tsx scripts/content-lint.ts` (full project, 30 targets) | ✅ exit 0 |
| Local `pnpm exec tsc --noEmit` | ✅ clean |
| Local `pnpm build` | ✅ `/` prerendered as static, revalidate 1h, expire 1y |
| Local Playwright homepage suite (10 × 2 viewports) | ✅ 20/20 |
| Local Playwright full suite (homepage + layout) | ✅ 26 passed / 2 skipped |
| GitHub Actions CI on main since `2bb8c47` | ✅ green |
| Vercel preview on PR #5 | ✅ deployed |
| Lighthouse mobile (Performance ≥ 90, A11y ≥ 95, LCP ≤ 2.0s, CLS < 0.05) | ⏸ Vercel preview, manual run pending |

---

## Follow-ups (carry into Phase 3)

1. **Manually create `editorial-letter-homepage` Page in `/admin`.**
   `scripts/seed-pages.ts` still can't run on Node 25 (Payload +
   `@next/env` interop bug, see Phase 1.5b hand-off). EditorialLetter
   renders the inline placeholder until the entry exists. First admin
   user gets created on first visit to `/admin`.
2. **Optionally upgrade `pages.body` from `textarea` to Lexical
   richText.** Only valuable when Aleks needs editorial formatting
   (lead, pull quote). Defer to Phase 3 or later.
3. **Create three `bibliothek-…` Page entries** (or a separate
   `BibliothekArticles` collection) so BibliothekTeaser reads real
   content instead of placeholders.
4. **Re-generate triptych positions 1+2** per `asset-mapping.md §4`.
   WerkstattTeaser uses only position 3 today; can replace with full
   triptych when assets land.
5. **Layout snapshot baselines.** Re-introduce after Phase 2 design
   ships HITL (Linux-flavored baselines so CI can run them).
6. **Lighthouse-CI in CI.** Phase 1.5a left `lhci` wired locally but
   excluded from CI. Wire `pnpm test:lighthouse` against the Vercel
   preview URL — Phase 7 or earlier.
7. **Sticky header morph.** Phase 1's deferred follow-up — Header
   sticks but doesn't shrink/morph on scroll. View Transitions API
   behind `@supports`. Not picked up in Phase 2.
8. **Component primitives extraction.** `<CapsLabel>`,
   `<SectionHeading>`, `<EyebrowLabel>` recur ≥ 3 times across home
   components. Right time is during the multi-brand `packages/ui/`
   pull-out (Phase 2 multi-brand or later).
9. **`lib/shopify-queries.ts`** — Phase 3 spec calls for this. The
   inline GraphQL in `FeaturedEditions` should move there alongside
   `getProduct(handle)`, `getAllProductHandles()`, etc.
10. **Centralize hairline constants.** Per-file split-into-two-consts is
    fine for now; a shared `tokens.hairline.{divider,card}` would be
    cleaner. Not blocking.

---

## Phase 3 entry points

- **Branch:** `phase-3-pdp` off main.
- **Read order:** `docs/MEGAPROMPT.md §PHASE 3`,
  `docs/asset-mapping.md §2.3` (PDP asset map), `docs/vocabulary.md §3`
  (Produkt-States — forbidden phrases listed there), this memo.
- **Files-to-create** (per spec §3.2; note `(frontend)` not
  `(storefront)`):
  - `app/(frontend)/editionen/[handle]/page.tsx`
  - `app/(frontend)/editionen/[handle]/loading.tsx`
  - `components/product/QuoteHero.tsx`
  - `components/product/MockupCarousel.tsx`
  - `components/product/VariantSelector.tsx`
  - `components/product/AddToCartButton.tsx` (only client island —
    Zustand cart store)
  - `components/product/EditorialEssay.tsx`
  - `components/product/MaterialSpecs.tsx`
  - `components/product/CrossLinks.tsx`
  - `components/product/ThemeTags.tsx`
  - `components/product/ProductJsonLd.tsx`
  - `lib/shopify-queries.ts` (will absorb FeaturedEditions' inline
    queries from Phase 2)
- **Asset map:** SKU posters in `apps/silbe/public/products/`
  (already imported from brain `cowork/outputs/sku-png-v3/`); composite
  mockups at `/mockups/silbe-{author}-{quote}-{scene}.jpg` per
  `asset-manifest.ts`.
- **Shopify metafields** (`asset-mapping.md §5.3`) need to be
  populated on each product before PDP can read them:
  `silbe.author_full_name`, `silbe.work_title`, `silbe.themes`, etc.
  Verify via Shopify Admin or push them via the metafields API.

---

## Open questions for the user

- **Section order.** Currently Hero → TrustBar → FeaturedEditions →
  FuenfStimmen → EditorialLetter → WerkstattTeaser → BibliothekTeaser.
  Locked, or want a swap before Phase 3?
- **Footer wordmark variants.** Header is HOT 2 ink-on-cream, footer is
  HOT 2 cream-on-charcoal. The HOT 2 gold variant is still in
  `public/brand/` unused. Retire `gold`, or keep it for future surfaces
  (gift-card mockups, holiday campaign)?
- **Component primitives extraction timing.** Phase 2.5 polish, Phase 3,
  or wait for the multi-brand `packages/ui/` pull-out?
