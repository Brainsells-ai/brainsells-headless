# SILBE Headless — Phase Hand-off

Single rolling reference for the current state of `apps/silbe`. Read this
at the start of any new Claude Code session to know where the project is.
The active phase lives inline below; prior phases are tracked in the table.

---

## Current phase — 8 · R8 Homepage

**Branch:** `feat/r8-homepage` · **PR:** [#25](https://github.com/Brainsells-ai/brainsells-headless/pull/25) · **Merge commit:** `2fd2985` · **Status:** ✅ merged · **Closed:** 2026-05-19.

### What was built

Replaced the Phase-2 homepage (Hero / TrustBar / FuenfStimmen / FeaturedEditions /
EditorialLetter / WerkstattTeaser / BibliothekTeaser) with the R8 7-section
structure per `silbe-r8-tech-handover.md` + `silbe-homepage-content-brief.md`:

| # | Section | Component | Notes |
|---|---|---|---|
| 1 | Hero | `components/home-r8/Hero.tsx` | 50/50 split per `silbe-hero-layout.html` — desktop 6:7 portrait crop, mobile 16:9 landscape crop, single Image master `/images/sku-02-rilke-habegeduld.jpg`. Sage hairline (64×1), Cormorant H1, underlined CTA. No `hero__credit` (composite is own work). |
| 2 | Editorial-Statement | `EditorialStatement.tsx` | Cream + Crimson prose, ~640 narrow. Draft copy from brief (Merlin REFACTOR-pass deferred). |
| 3 | Featured Editions | `FeaturedEditions.tsx` | 3 cards in fixed order Rilke → Kafka → Zweig, image-by-handle mapping in `lib/featured-homepage.ts`. Data via new `getHomepageFeaturedEditions()` in `shopify-queries.ts` — fetches the 3 handles via `products(query: "handle:a OR handle:b OR handle:c")` and re-orders to spec. Custom price formatter outputs `€ 32` (Euro voran + NBSP). Fallback "Die ersten Editionen sind in Vorbereitung" when zero matches. |
| 4 | Essay-Teaser | `EssayTeaser.tsx` | "Woher die Zeile kommt" — Cormorant italic H2 + Crimson body + Mehr-lesen-CTA → `/editionen/silbe-rilke-geduld-goldrahmen`. |
| 5 | About-Teaser | `AboutTeaser.tsx` | Typo-only block, "zwei Menschen in Wien" placeholder draft → `/ueber-uns`. |
| 6 | Newsletter | `NewsletterSection.tsx` | Cream-bg variant of the Newsletter form on the homepage. Reuses `subscribeAction`. Footer's Phase-5 charcoal NewsletterForm is unchanged — same action, separate visual treatment. |
| 7 | Footer-Wordmark-Fix | `components/layout/Footer.tsx` (edit) | TAGLINE: "SILBE versammelt Zeilen aus dem literarischen Kanon — jede mit ihrer Quelle." (replaces the Phase-5 "Wir sehen die Edition als die kleinste Form eines Verlags."). |

Plus `tests/e2e/homepage.spec.ts` fully rewritten — 15 cases × 2 projects = 30,
covering all 6 visible sections + a11y (`html lang`, single H1, page-title
exact, every section as landmark, no archived voices / no forbidden phrases).
`tests/e2e/layout.spec.ts` footer assertion updated to the new TAGLINE.

Page metadata `title.absolute = 'SILBE — Editionen aus dem literarischen Kanon'`.

### Architecture decisions locked

- **`getHomepageFeaturedEditions(handles)`** new in `shopify-queries.ts` —
  deterministic 3-card fetch by exact handle list. Does not depend on a
  Shopify "featured" collection state or BEST_SELLING sort. Legacy
  `getFeaturedEditions()` removed in follow-up PR #27.
- **Image-by-handle mapping in `lib/featured-homepage.ts`** — single source
  of truth. The component never hardcodes which image goes with which card.
- **Cream-bg Newsletter is a separate component**, not a `tone` prop on the
  Phase-5 `NewsletterForm`. ~80 LOC duplication accepted for scope discipline
  in R8 — Phase 9 / Polish PR can extract a `<NewsletterFormCore>` if both
  variants persist.
- **Hero composite renders both crops from one master via container-aspect-
  ratio + `object-fit: cover`** — no Sharp pre-cut derivatives. Source is
  1024×1024 (sufficient for typical viewport sizes); spec'd 1200×1400 /
  2000×1125 targets are container intents, not file dimensions.
- **No `hero__credit` overlay** — composites are own work (fal.ai FLUX from
  CC0 Wien-Museum references, see `_lizenzen.md`). The reference HTML's
  Wikimedia credit pattern intentionally omitted.
- **R8 CSS in `globals.css`** — three rules: `.silbe-r8-hero`,
  `.silbe-r8-hero-figure`, `.silbe-r8-hero-content` (responsive split) plus
  `.silbe-r8-featured-grid` (1 → 2 → 3 columns by breakpoint). All inline
  styles otherwise (matches Phase-7 legal-pages convention).
- **Custom price formatter `€ 32`** in `FeaturedEditions.tsx` — Intl.
  NumberFormat defaults to `32,00 €` (Euro hinten); replaced with `${€}{NBSP}{integer-or-2dp}` to honor the acceptance spec.

### Gates green (local)

- ✅ `pnpm exec tsc --noEmit` clean
- ✅ `pnpm lint:content` 77 targets, 0 forbidden phrases (one fix: U+0022 closing
  quote in `EssayTeaser.tsx` comment → U+201C `“`)
- ✅ `pnpm build` 22 routes — `/` rendered as `○ Static` with `1h` revalidate
- ✅ `pnpm exec playwright test --grep-invert @snapshot` — 116 passed / 4 skipped
  (price-format check skips when Shopify featured fallback is rendering)
- ✅ MCP visual smoke Desktop 1280×900 + Mobile 393×852 — both renders
  confirm 7-section layout, hero split, cream backgrounds, charcoal footer

### Pending Aleks/Merlin actions

1. **Merlin Refactor-Pass** on draft copy (per content brief REFACTOR-HINWEIS):
   - Section 2 Editorial-Statement (most generic, most needs the SILBE voice)
   - Section 4 Essay-Anriss (third Brücke-zum-Heute-Satz currently missing —
     will come from the real Rilke editorial-essay when written)
   - Section 5 About-Teaser ("zwei Menschen in Wien" vs. real names)
2. **Composite `sku-02-rilke-habegeduld.jpg` has "deinem Herzen" baked into
   the framed-poster text** — Sie-Form acceptance is met in code, but the
   image's poster text uses Du-Form. Regenerate the composite or accept as
   acceptable-since-it's-inside-the-image-not-website-copy.
3. **Carryover from Phase 7** still applies: Impressum
   `[INHABER LAUT FIRMENBUCH]` placeholder · Firmenbuchnummer "in
   Bearbeitung" · DE-Versand activation · Klaviyo list setup + DOI + DACH-
   GDPR mail · Vercel env vars · Klaviyo From-email · DNS for `send.silbe.at`

### R8 follow-ups

- ✅ **R8 cleanup** — `components/home/*` (7 files) + legacy
  `getFeaturedEditions()` + its two query consts removed in PR #27
  (merge `b0d293c`), −1061 LOC, no functional change.
- ✅ **Brand-handle migration (Pattern 0)** — 3 active Gelato-SKUs umbenannt
  von Goldrahmen-Schema auf Brand-Standard in PR #30 (merge `520a18f`,
  Session 2026-05-19): `silbe-rilke-geduld-goldrahmen` →
  `silbe-rilke-habegeduld`, `silbe-kafka-axt-goldrahmen` → `silbe-kafka-axt`,
  `silbe-zweig-unbekannte-goldrahmen` → `silbe-zweig-dir-der-du`. 5 Files,
  +21/−21. Unblockt `/editionen` (Schnittmenge mit Shopify-Katalog).
- ⏭️ **Card-Title-Balance (Pattern 0 Polish) — bewusst nicht umgesetzt**
  (Session 2026-05-19). Beobachtung: `/editionen`-Cards zeigen Rilke 1-zeilig,
  Kafka + Zweig 2-zeilig (balanced). `textWrap: 'balance'` ist bereits aktiv
  auf `<h2>` (`app/(frontend)/editionen/page.tsx:158`). Card-Höhen werden
  vom 3:4-Image-Block dominiert, die Title-Asymmetrie ist editorial legitim —
  Zweig hat halt den längsten Titel. Kein `minHeight`, kein Suffix-Drop,
  keine Code-Änderung. Branch `chore/silbe-card-title-balance` ungemerged
  gelöscht.

### Carry-forward to Phase 9+

- **NewsletterForm cream-bg / charcoal-bg unification** — extract a shared
  core when a third variant is needed (or keep parallel, both are working).
- **Old PR-7 carry-forward unchanged:** Cookiebot wiring (Phase 9), GA4 +
  Meta Pixel (Phase 10), 301-Redirects audit (Phase 9), `/ueber-uns`
  editorial pass, DOI-mail brand-pass, CH-geo-detection, `/stimmen` +
  `/bibliothek` listing routes, MockupCarousel, ProductJsonLd,
  `formatPrice` extraction (4+ callsites now), Variant deep-link hydration flash.

---

## Previous phase — 7 · Legal Pages

**Branch:** `phase-7-legal-pages` · **PR:** [#22](https://github.com/Brainsells-ai/brainsells-headless/pull/22) · **Merge commit:** `d9dc844` · **Closed:** 2026-05-13.

### What was built

Seven content-only routes under `app/(frontend)/` that resolve the footer-link
404s carried over since Phase 5:

| Route | Title (template appends `· SILBE`) | Highlights |
|---|---|---|
| `/impressum` | Impressum | § 5 DDG · § 25 MedienG · `[INHABER LAUT FIRMENBUCH]` placeholder preserved |
| `/agb` | AGB | §§ 1–13 · §11 Gelato (Poster/PK) + Printful (Tote) · §3 DE+AT €39-Threshold · Cross-links to `/widerrufsrecht` + `/datenschutz` |
| `/datenschutz` | Datenschutz | DSGVO · Klaviyo US + DPF + SCC · Cookiebot only · §8 external link `dsb.gv.at` |
| `/widerrufsrecht` | Widerrufsrecht | § 356a BGB / § 11 FAGG · PoD note · Cross-link to `/widerrufsformular` |
| `/widerrufsformular` | Widerrufsformular | Muster with 5 styled form-blanks (hairline `<div>` instead of literal `_____`) |
| `/versand` | Versand | Material: Poster 200g/m² Premium-Matt · Postkarten 300g/m² · Tote Bags zertifizierte Baumwolle · 3-5 Werktage DE+AT |
| `/cookie-einstellungen` | Cookie-Einstellungen | Stub: disabled Cookiebot-button + Phase-9 note · Cross-link to `/datenschutz` |

Plus `tests/e2e/legal-pages.spec.ts` — 14×status/H1/title-template + 2×footer-link-visible + 2×AGB→Widerrufsrecht→Widerrufsformular cross-link-chain. 18 new cases (9 per project × 2 projects).

### Architecture decisions locked

- **Inline styles per file** (no DRY extract) — matches existing `/ueber-uns` convention; legal pages are static content, no shared primitive needed
- **Single `metadata.title` short word per route** (e.g. `'Impressum'`); root layout `title.template '%s · SILBE'` appends the suffix — never include `· SILBE` in page metadata
- **`<address>` element for contact blocks** (Impressum, Datenschutz §1, Widerrufsrecht, Widerrufsformular) — semantically correct
- **`mailto:` links for `hallo@silbe.at`** (not plain text)
- **Cross-links via Next.js `<Link>`**, external links with `rel="noopener noreferrer" target="_blank"`
- **Markdown `---` rendered as `<hr>`** with `border-top: 0.5px solid color-mix(in srgb, var(--color-ink) 30%, transparent)`
- **Cookiebot-button as `disabled <button>` + italic Phase-9 note** in `/cookie-einstellungen` — visually obvious "not yet wired"
- **Form-blanks as `aria-hidden <div>`** with `border-bottom: 0.5px ink @40%` — print-friendly, screen-reader-clean
- **`[INHABER LAUT FIRMENBUCH]`** preserved verbatim — separate polish-PR before production deploy will replace
- **All 7 routes rendered as `○ Static`** at build time (no SSG-params, no ISR — pure static)

### Gates green (local)

- ✅ `pnpm exec tsc --noEmit` clean
- ✅ `pnpm lint:content` 70 targets, 0 forbidden phrases (one fix in `agb`: straight U+0022 close-quote → U+201C `"`)
- ✅ `pnpm build` 22 routes — all 7 legal pages prerendered
- ✅ `pnpm exec playwright test` 108 passed / 2 skipped (Phase-6 baseline 90 + 18 new)
- ✅ MCP visual smoke Desktop 1280 on `/impressum` (short) + `/agb` (long): Cream BG · Cormorant italic H1+H2 · Crimson body · max-w 720 centered · hairline before Stand-date · Footer inheritance clean
- ⚠️ MCP Mobile-resize stalled in shared browser session — Mobile coverage via Playwright `mobile-chromium` project (9 legal tests pass on 375×812); layout is fluid via `clamp()` only, no viewport-conditional CSS

### Pending Aleks-actions

1. **Replace `[INHABER LAUT FIRMENBUCH]`** in `apps/silbe/app/(frontend)/impressum/page.tsx` line ~87 with the actual legal-entity owner name — single occurrence, simple find-replace, separate polish-PR before production deploy
2. **Replace "Eintragung in Bearbeitung"** Firmenbuchnummer (Impressum) once the registration is through
3. **DE-Versand activation in Shopify** — if not yet enabled, the AGB/Versand-page claim "wir liefern nach Deutschland und Österreich" contradicts reality
4. **Carryover from Phase 5** still pending: Klaviyo list setup + DOI + DACH-GDPR confirmation email · Vercel env vars (`KLAVIYO_PRIVATE_KEY`, `NEXT_PUBLIC_KLAVIYO_LIST_ID`) · Klaviyo From-email on `hallo@silbe.at` · DNS records for Klaviyo sending-domain `send.silbe.at` at WebGo

### Carry-forward to Phase 8+

- **Homepage editorial review** (Phase 8) — section order, Lasker-Schüler residuals
- **Cookiebot integration** (Phase 9) — wire the stub in `/cookie-einstellungen` to real CMP
- **GA4 + Meta Pixel** (Phase 10) — consent-gated via Cookiebot
- **301-Redirects from old Liquid theme** (Phase 9) — full SEO-audit map, current `next.config.ts` only covers `/werkstatt`/`/pages/ueber-uns`
- **`/ueber-uns` editorial pass** — current 2-paragraph stub gets final copy
- **DOI-mail brand-pass** — Klaviyo template aesthetic match
- **CH-geo-detection** — `FreeShipBar` zone-keyed threshold (€39 DE/AT · €69 CH), out-of-scope until CH-Versand active
- **`/stimmen` + `/bibliothek` listing routes** — Phase 7+ original plan, not in Phase 7 scope
- **MockupCarousel** — multi-image PDP gallery (Phase-3-deferral, still open)
- **ProductJsonLd** — Agentic-discovery `<script type="application/ld+json">` block (Phase-3-deferral, Gate Phase 8 cutover)
- **`formatPrice` extraction** to `lib/format.ts` (4 callsites duplicated as of Phase 6)
- **Variant deep-link hydration flash** (Phase 6 known issue) — ~50–200 ms A3→A2 swap on direct `?variant=A2` deep-link

---

## Phase history

| Phase | Title | PR | Merge commit | Status |
|---|---|---|---|---|
| 8 — R8 Homepage | `feat/r8-homepage` | #25 | `2fd2985` | ✅ merged |
| 7 — Legal pages | `phase-7-legal-pages` | #22 | `d9dc844` | ✅ merged |
| 6 — `not-found` · `/editionen` · `VariantSelector` | [handoff-phase-6.md](./handoff-phase-6.md) | #18, #19, #20 | `97b4035`, `54eeb10`, `d26d7fd` | ✅ merged (3 PRs) |
| 5 — Header / Footer / Navigation + Klaviyo | [handoff-phase-5.md](./handoff-phase-5.md) | #14, #15, #16, #17 | `a0c6a06` | ✅ merged (4 PRs) |
| 4 — Cart-Drawer + Checkout-Redirect | [handoff-phase-4.md](./handoff-phase-4.md) | #13 | `3ed3ae3` | ✅ merged |
| 3 — PDP implementation | [handoff-phase-3.md](./handoff-phase-3.md) | #12 | `4d1e896` | ✅ merged |
| 3 — Prep infrastructure | [handoff-phase-3.md](./handoff-phase-3.md) | #11 | `7d46f0c` | ✅ merged |
| 2 — Homepage | [handoff-phase-2.md](./handoff-phase-2.md) | #5 | `c6c679e` | ✅ merged |
| 1.5b — Payload bootstrap | [handoff-phase-1.5b.md](./handoff-phase-1.5b.md) | #4 | `2de0ab8` | ✅ merged |
| 1.5a — Playwright scaffolding | [handoff-phase-1.5a.md](./handoff-phase-1.5a.md) | #3 | `8d5c741` | ✅ merged |
| 1 — Layout system | [handoff-phase-1.md](./handoff-phase-1.md) | #2 | `82dcb34` | ✅ merged |
| 0 — Setup | (no memo) | #1 | `a3c7c0f` | ✅ merged |

## Build-pipeline hotfixes (Phase 2 series)

Three small CI / Vercel infrastructure fixes that landed alongside Phase 2 to
unblock `main`:

| PR | Commit | Fixes |
|---|---|---|
| #6 | `f099b61` | `turbo.json` env declarations — Vercel build |
| #7 | `6e283ac` | `.github/workflows/test.yml` env block — CI build step |
| #8 | `2bb8c47` | `pnpm <script> -- <args>` forwarding bug — CI Playwright step |

See "The build-pipeline incident" section of `handoff-phase-2.md` for the
full sequence.

## Update protocol

This is the single rolling hand-off file for SILBE headless. When closing a
phase:

1. Replace the **Current phase** section above with the new phase's narrative —
   PR link, what was built, architecture decisions locked, gates green, pending
   actions, carry-forward. Aim for ~80–120 lines of inline narrative; the prior
   current-phase content is captured by its row in the **Phase history** table
   (and, for pre-Phase-7 phases, by its linked `handoff-phase-N.md` memo).
2. Add a row to the **Phase history** table with PR number(s), merge commit
   hash(es), and status.
3. From Phase 7 onward, do not create per-phase memo files. The pre-Phase-7
   `handoff-phase-N.md` files (Phases 1–6) exist for historical reasons and
   stay linked from the table. The rolling-narrative-in-LATEST pattern is the
   active convention going forward.
