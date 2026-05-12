# Hand-off — Phase 3 (PDP) — WIP

**Status:** Phase 3 split into multiple PRs. PR #11 (prep
infrastructure: metafield definitions, manifest, primitives, shopify
read layer) was **squash-merged to main on 2026-05-11** as `7d46f0c`.
PR #12 + #13 (planned) ship the actual PDP components and route. This
memo carries two sections: (1) the reusable **Squash-Merge-Checklist**
template for PR #12/#13, and (2) the **Session 2026-05-11 — Phase-3
Prep Close** record of what landed and what's open.

---

## Squash-Merge-Checklist PR #11

Pre-merge gates for the phase-3-prep PR. Applies after CI green and
Vercel preview deployed.

### 1. CI green on GitHub Actions

All workflow steps pass on `pull_request` event:
- Build step (next build via turbo)
- Playwright non-snapshot suite (`test:e2e:non-snapshot`)
- Content-lint pre-build (covered by `lint:content` script in CI)
- TypeScript noEmit check (covered by `next build` running tsc)

If red: capture failure output, fix on `phase-3-pdp` branch, force-push
is unnecessary (regular push amends the PR).

### 2. Vercel-Preview-Path-Inspection

Routes that must render without regression on the Vercel preview URL:

- **`/`** — Homepage. CapsLabel extraction is an internal refactor;
  no visual delta expected vs `main`. Verify hero H1 quote uses
  deutsche Anführungszeichen `„…"` (the Klasse-1 fix is visible on
  the rendered surface — verify byte-correctness in DevTools).
- **`/admin`** — Payload admin boots. No Payload changes in this PR,
  but the build path touches the shared route group; smoke-check
  that the admin login screen renders.
- **`/editionen/silbe-rilke-geduld-hero-burgundy`** — must currently
  404 or render Next.js's default not-found page. PDP route not yet
  built (planned PR #12 + #13). This is a NEGATIVE smoke test —
  confirms the canonical handle isn't accidentally wired anywhere
  prematurely.

**Known 404s (non-blockers for PR #11 merge):** Five routes are
linked from Header/Footer/Hero CTAs but unimplemented in this PR.
Next.js RSC-Prefetch triggers 404s for them; "Alle Editionen ansehen"
is an actively-clickable 404 trap. Routes:

- `/editionen` — collection listing, Phase 5
- `/bibliothek` — editorial hub, Phase 5
- `/werkstatt` — about page, Phase 5
- `/stimmen` — voice hub, Phase 5
- `/warenkorb` — cart, Phase 4

These 404s render Next.js's bare default page (no SILBE Header/Footer
/Brand-Tone) because `app/(frontend)/not-found.tsx` does not yet exist.
The 404 itself is controlled (no crash, no 500), so PR #11 ships as-is.
Both items captured in `docs/polish-list.md` (RSC-Prefetch 404er +
Custom 404-Page).

### 3. Playwright-Specs against Preview-URL (optional)

Local 20/20 green is the bar. Belt-and-suspenders pre-merge:

- `tests/e2e/homepage.spec.ts` — 20 tests × 2 viewports. Verifies
  hero, trust-bar, fünf stimmen, featured-editions, a11y.
- `tests/e2e/layout.spec.ts` — header, footer, redirect, drawer
  (Phase-1 baseline).

To run against preview: set `PLAYWRIGHT_BASE_URL=<preview-url>` and
re-run; default config currently points to dev server.

### 4. Manual smoke-tests at Vercel-Preview

- Hero H1 Quote: closing character is `"` (U+201C, „high-6")
  — inspect via DevTools, copy char, paste into Unicode lookup.
- FuenfStimmen section: all five canonical voices listed with full
  names. Lasker-Schüler must NOT appear (archived voice — drift
  signal).
- FeaturedEditions: either renders Shopify product cards OR the
  „In Vorbereitung" fallback panel — both shapes are valid.
- Browser DevTools Console: no JavaScript errors, no 404s on
  static assets (mockups, brand wordmark, OG cards).

### 5. Polish-list completeness audit

Verify all Phase-3-prep deferred items are captured in
`docs/polish-list.md`:

- Catalog/Shopify — Legacy SKU cleanup (15 pre-migration handles)
- Brand assets — 3 KILL items from Creative-Audit 2026-05-11
- Commerce — PDP Multi-Variant „ab"-Preis-Display (PAngV)
- Tooling — Git remote URL drift, PR-title-naming convention
- Layout — Footer wordmark gold variant, primitives partial
  extraction (Phase-2 carry-over)

If any deferred item from the PR review session was missed: add
before squash-merge so future-phase Claude inherits it.

### 6. TODO_AUTHOR-marker review status

`scripts/metafields-manifest.ts` carries ~55 TODO_AUTHOR markers
across ~15 distinct editorial decisions. Pre-merge confirmation
loop:

- Aleks has the list and an ETA for the decisions?
- Which TODOs are blockers for `seed-metafield-values.ts`
  (script not yet written — planned alongside PR #12/13)?
- Which TODOs are non-blocking (e.g., themes finalization can
  ship empty array initially)?

### 7. Phase-3-prep documentation state

This file (`.claude/handoff-phase-3.md`) currently contains only
the squash-merge checklist. At phase close (after PR #13 merges)
it needs the standard sections per Task #8:

- §What landed (commits per PR, with one-line summaries)
- §Deviations from spec
- §Acceptance signals (test results, Lighthouse scores)
- §404-Handling (legacy 15 SKU handles — redirect-map or
  archive-page route before Phase 8 cutover)
- §Aspect-Ratio-Klärung (PDP hero slot: 5:4 vs 2:3 decision)
- §Phase-4 follow-ups (Bundle-PDP-Template + Postcard-Set-PDP-
  Template — Multi-Quote / Multi-Voice render paths)
- §Voice-Constants (lib/constants/voices.ts as canonical SoT)
- §Content-Lint-Hardening (U+201C closing-quote rule)
- §Multi-Variant-Format-Strategy (β: variant-level SoT,
  product-level metafield null for Multi-Variant SKUs)
- §Follow-ups (carry forward to Phase 4)
- §Phase 4 entry points

The Squash-Merge-Checklist itself stays as a reusable template
for PR #12 and PR #13 — copy + adapt the path/spec lists.

---

## Session 2026-05-11 — Phase-3 Prep Close

### Was wurde gemerged

PR #11 squash-merged to `main` as `7d46f0c`, collapsing 5 commits from
`phase-3-pdp`:

- `080d884` — phase-3 metafield seed infra. 11 silbe.* metafield
  definitions seeded live on `z9xkt0-2v.myshopify.com` via OAuth Client
  Credentials Grant (per Shopify 2026-01 auth migration). GIDs
  `408237310292..408237637972`, all `access.storefront: PUBLIC_READ`.
  `check-metafields.ts` diagnostic + `.env.example` swap to
  `SHOPIFY_SHOP / CLIENT_ID / CLIENT_SECRET`.
- `b4b1e85` — phase-3 metafield manifest draft + voices + polish-list.
  `lib/constants/voices.ts` (5 CANONICAL_VOICES + 2 ARCHIVED, type
  guards, VOICE_FULL_NAMES) and `scripts/metafields-manifest.ts`
  (two-layer BRAND_CONSTANTS + EDITIONS, TODO_AUTHOR sentinels).
- `29ad9a8` — klasse 1+2+3 manifest review + content-lint hardening +
  variants check + multi-variant strategy. 13 U+0022→U+201C fixes in
  manifest plus 6 in Phase-2 home components surfaced by new lint rule.
  SURFACE_COPY drift removed. `scripts/check-variants.ts` introduced
  (8-edition live diagnostic, ISO-216 drift detection). product_type
  discriminator added.
- `a1a4318` — CapsLabel primitive extraction. 9 inline usages across
  7 home components → single `components/primitives/CapsLabel.tsx`.
  Net −100 lines homepage code.
- `9187e22` — lib/shopify-queries. Canonical Shopify Storefront read
  layer with manifest-driven voice resolution (VOICE_BY_HANDLE Map
  primary, Shopify metafield/tag as drift-warn cross-check). No
  cross-voice BEST_SELLING fallback in getRelatedProductsByVoice.
  FeaturedEditions refactored to use getFeaturedEditions().

### Architektur-Entscheidungen fixiert (TECH, locked 2026-05-11)

These are not provisional — future Phase-3 work and Phase-4+ must respect
them or trigger an explicit revision.

- **β-Multi-Variant Strategy** — Variant.selectedOptions is the canonical
  SoT for format + dimensions on Multi-Variant Hero-SKUs (Rilke-Hero,
  Mann-Einsamkeit-Hero, Zweig-Memorial). Product-level `silbe.format`
  and `silbe.dimensions_cm` are `null` for these SKUs. Single-variant
  Goldrahmen-SKUs carry the values normally.
- **Manifest-driven voice resolution** — `VOICE_BY_HANDLE` Map in
  `lib/shopify-queries.ts` is primary SoT. Shopify metafield
  `silbe.author_handle` and product tag `author:*` run via
  `inferVoice()` for drift-detection only (console.warn on divergence,
  manifest always trusted).
- **β-β Related-Fallback** — `getRelatedProductsByVoice()` returns empty
  array when no same-voice peers exist. No cross-voice BEST_SELLING
  fallback. CrossLinks component (Task #5) responsible for `return
  null` on empty peers — no empty container, no placeholder text.
- **product_type Discriminator** — `'edition' | 'postcard_set' |
  'bundle'`. Only `'edition'` SKUs in `CANONICAL_HANDLES` whitelist for
  PR #11. Postcards + bundles deferred to Phase 4 templates.

### Open Tasks für nächste Session (PR #12 + #13 scope)

- **Task #3** — `EditorialEssays` Payload collection (productHandle,
  intro text, body Lexical richText, optional pullQuote).
- **Task #5** — Product components in dependency order:
  - `ProductJsonLd` (pure server, inline `<script type="application/ld+json">`)
  - `QuoteHero` (RSC, reads metafields + essay.intro)
  - `MaterialSpecs` (RSC, byte-identical to SURFACE_COPY)
  - `ThemeTags` (RSC, 5–7 themes, non-clickable Phase-3)
  - `EditorialEssay` (RSC, Lexical → React renderer)
  - `MockupCarousel` (RSC + tiny client island, CSS scroll-snap mobile,
    thumbnail-click desktop)
  - `VariantSelector` (RSC, `?variant=` URL-param state)
  - `AddToCartButton` (THE client island; stub until Phase 4 Zustand
    store)
  - `CrossLinks` (RSC, `return null` if `peers.length === 0`)
- **Task #6** — `app/(frontend)/editionen/[handle]/page.tsx` with
  `generateStaticParams` (CANONICAL_HANDLES), `generateMetadata`
  (per-author OG card), Suspense around CrossLinks for below-fold
  streaming, `loading.tsx` with Hairline placeholder.
- **Task #7** — `tests/e2e/pdp.spec.ts` covering 10 tests × 2 viewports
  per Phase-3 plan §6.

### Bekannte Probleme (non-blocking, captured in polish-list)

- **RSC-404er für 5 unimplementierte Routes** (`/editionen`,
  `/bibliothek`, `/werkstatt`, `/stimmen`, `/warenkorb`) — selbst-
  auflösend Phase 3-5.
- **Default-404 ohne SILBE-Branding** — `app/(frontend)/not-found.tsx`
  fehlt. Custom 404-Page mit Editorial-Copy vor Phase 8 Cutover.
- **Multi-Variant „ab"-Preis-Display** — Phase-2-Verhalten bewusst
  beibehalten. PAngV-Compliance-Risk dokumentiert, Tech-Fix-Skizze
  (SummaryProduct.priceRange.max + Conditional Format) in polish-list.
- **Payload Production-Admin-Bootstrap manuell durchgeführt** —
  hello@brainsells.ai am 2026-05-11 angelegt. Bootstrap-Automation als
  Phase-1.5b-Carry-over in polish-list.
- **Shopify App Cleanup** — drei Apps im Store nach Token-Setup-
  Iterationen (SILBE Claude Code, SILBE Admin Operations, SILBE Admin
  Token). Nicht-genutzte vor Cutover deinstallieren.

### Aleks-TODOs aus Manifest

~15 distinct editorial decisions blockieren `seed-metafield-values.ts`
(script noch nicht geschrieben — geplant alongside PR #12/#13).
Hauptklassen:

- **Quote-Text-Verifizierung byte-identisch zum Poster** — Kafka-Axt,
  Mann-Einsamkeit, Zweig-Memorial, Zweig-Unbekannte, EE-Aphorismus
- **Werk-Quellen-Klärung** — Mann (›Tonio Kröger‹ vs ›Tod in Venedig‹
  vs anderes), Zweig (›Sternstunden‹ vs ›Welt von Gestern‹ vs
  Brief/Essay)
- **Themes-Finalisierung** — 5–7 Tags pro SKU
- **Bundle/Postcard-Set Schema-Strategie** — Phase-4-relevant, blockiert
  nicht PR #12/#13

### Smoke-Tests am Vercel-Preview (2026-05-11, vor Squash-Merge)

- §1 Homepage — ✅ visuell sauber, Anführungszeichen-Fix sichtbar,
  Console clean für App-Code
- §2 Payload /admin — ✅ First-Run Welcome-Page, manueller Admin-User
  angelegt (hello@brainsells.ai)
- §3 PDP-Negative — ✅ `/editionen/silbe-rilke-geduld-hero-burgundy`
  rendert Next.js Default 404 (Option b confirmed, Custom-404
  ist Polish-Item)

---

## Session 2026-05-12 — Phase-3 PDP Implementation (PR #12 pre-merge)

### Was in PR #12 ist

4 commits auf `phase-3-pdp-implementation`, ahead of `main` (`a723e76`):

- `1b0bb93` — **EditorialEssays Payload collection.** slug-based primary
  key (1:N — ein essay serves Hero + Goldrahmen-Variante derselben
  Edition via shared editorial_essay_handle). Lexical features explicit
  constrained: italic + link inline, h3/h4 + blockquote + lists + hr
  blocks. No bold/underline/inline-code. pullQuote als top-level Group
  field (text + optional source) — keine Lexical-Custom-Blocks. KEIN
  author/voice field auf der Collection (Voice ist product-property via
  manifest VOICE_BY_HANDLE; Phase 5 VoiceBios-Collection später).
  Plus `lib/payload-queries.ts` mit `getEditorialEssayBySlug()` (try/catch
  um Postgres-table-missing-error abgefangen).
- `0ad3ba3` — **PDP components + route.** 6 components per DoD (Hero,
  MaterialSpecs, EditorialEssay-Renderer, ThemeTags, CrossLinks,
  Breadcrumbs) + AddToCartButton client-island stub + `page.tsx`
  (generateStaticParams reads CANONICAL_HANDLES manifest, parallel
  Promise.all fetch product+essay, Suspense around CrossLinks for below-
  fold streaming) + `loading.tsx` (Hairline placeholder, no spinner).
  Drei DoD-Drops zu polish-list: MockupCarousel, VariantSelector,
  ProductJsonLd.
- `ba159fd` — **PDP Playwright suite + dynamicParams gate.** 23 tests
  × 2 viewports = 46 green (12 @pdp flagship, 4 @a11y, 8 @pdp-smoke
  cross-handle, 3 @pdp-negative). Plus `export const dynamicParams =
  false` auf page.tsx — fixt das Next-16-Default wo non-canonical handles
  200 statt 404 returnt.
- `17ccab5` — **a11y audit fix + 4 polish entries.** Critical:
  `.silbe-cart-button:focus-visible` rule in globals.css restoriert den
  fokus-ring den `appearance: none` auf WebKit/Safari stripped. Non-
  critical zu polish-list: Hover-States, touch-action manipulation,
  pre-seed-0-h1, taupe-on-cream Color-Contrast WCAG AA.

### Architektur-Entscheidungen fixiert in PR #12 (TECH, locked 2026-05-12)

- **EditorialEssays slug-based** — Primary key matches
  silbe.editorial_essay_handle metafield. 1:N (essay → SKUs). NOT
  Shopify productHandle.
- **No author/voice field on EditorialEssays** — voice lives on
  product (Shopify-metafield + manifest VOICE_BY_HANDLE). Phase 5
  VoiceBios-Collection separat für editierbare Bio-Content.
- **Lexical features explicit constrained** — italic + link inline,
  h3/h4 + blockquote + lists + hr blocks. No bold/underline/strike
  per SILBE editorial-restraint.
- **pullQuote als top-level Group, kein Lexical-Custom-Block** — ein
  pull-quote pro essay, renderer controls placement.
- **Hero quote-prominent (Titel = Quote)** — H1 ist das Zitat, nicht
  product.title (Marketing-internal). Pre-seed = 0 h1 (self-resolving
  durch Aleks-Seed).
- **Featured-image-only Hero** — single product.images[0] mockup.
  Multi-Image (MockupCarousel) ist polish-item.
- **No VariantSelector** — Multi-Variant Hero-SKUs (Rilke, Mann, Zweig
  memorial) zeigen Standard-Variante (variants[0]). A2 nicht user-
  wählbar bis VariantSelector kommt (Phase 4 polish).
- **No ProductJsonLd** — agentic-discovery deferred zu Phase 7/8
  polish-item.
- **CrossLinks returns null on empty peers** — β-β decision (no cross-
  voice BEST_SELLING fallback). Kafka + Ebner-Eschenbach PDPs zeigen
  keine CrossLinks-Section bis Phase 5–6 peers addet.
- **dynamicParams = false** — non-canonical handles return clean 404
  ohne ProductPage-invocation.

### Squash-Merge-Checklist PR #12 (applied template)

Pre-merge gates für PR #12, basierend auf der Template-Section §1–§7
above.

#### §1 CI green
Same workflow als PR #11 — Build, Playwright non-snapshot suite,
content-lint, tsc noEmit alle auf `pull_request` event.

#### §2 Vercel-Preview-Path-Inspection für PR #12

- **`/editionen/silbe-rilke-geduld-hero-burgundy`** — flagship PDP.
  Pre-seed-state: Breadcrumbs + Hero region (mit "Rainer Maria Rilke"
  source caption, ohne Quote-H1 weil metafield empty), Featured-image,
  Material-Specs mit 4 canonical strings + Format „A3 (29.7 × 42 cm)",
  Editorial-Section mit „Editorial-Kontext folgt."-Placeholder,
  ThemeTags absent (empty array), CrossLinks absent (no peer-data).
  Price gerendert in EUR-Format. Add-to-Cart-Button visible mit Vergriffen-
  state je nach Shopify availability.
- **`/editionen/silbe-kafka-axt-goldrahmen`** — single-variant SKU.
  Same structural rendering. Confirms CrossLinks null (Kafka-only-
  edition) without rendering empty container.
- **`/editionen/silbe-rilke-geduld-goldrahmen`** — sibling of flagship.
  Same essay-slug (`rilke-habe-geduld`) → if essay seeded, both
  PDPs show same essay content. Pre-seed: both show placeholder.
- **`/editionen/bundle-goldrahmen-trio`** — should be 404 (product_type
  bundle, excluded from CANONICAL_HANDLES). dynamicParams gate.
- **`/editionen/rilke-a3-habegeduld`** — should be 404 (legacy SKU
  outside whitelist). dynamicParams gate.

#### §3 Playwright-Specs gegen Preview (optional)

- `tests/e2e/pdp.spec.ts` — 23 × 2 = 46 tests. @pdp + @a11y + @pdp-smoke
  + @pdp-negative tags.
- Plus homepage + layout regression (no PDP changes to homepage but
  CapsLabel-extraction from Phase-3-prep-PR is now consumed by PDP
  too).

#### §4 Manuelle Smoke-Tests am Vercel-Preview

- AddToCartButton Tab-Focus: Tab in button, confirm `:focus-visible`
  ring erscheint (2px ink, 4px offset). Klick-Focus sollte KEIN Ring
  zeigen (das ist `:focus-visible` semantics, nicht `:focus`).
- AddToCartButton mobile tap — kein visible 300ms-Delay (touch-action
  manipulation noch nicht gesetzt — polish-item, accept delay für
  diese PR).
- /admin/collections/editorial-essays — Aleks kann jetzt eine essay
  mit slug `rilke-habe-geduld` anlegen. Lexical-Editor zeigt nur die
  whitelisted features (italic + link inline; h3/h4 + blockquote +
  lists + hr blocks). Save → check DB row → re-render
  `/editionen/silbe-rilke-geduld-hero-burgundy` → essay content erscheint
  in Editorial-Section. (Funktioniert nur falls Migration auf
  Production-Postgres durch — sonst getEditorialEssayBySlug returns
  null → placeholder render.)
- Browser DevTools Console: kein JavaScript-Error, kein 404 auf static
  Assets (mockups, brand wordmark, OG cards).

#### §5 Polish-list completeness audit

PR #12 hat polish-list erweitert um:
- MockupCarousel (Multi-Image Gallery)
- VariantSelector (A3/A2 Picker)
- ProductJsonLd (Agentic-Discovery)
- EditorialEssays Postgres-Migration auf Production
- Hover-states für interaktive PDP-Elemente
- touch-action: manipulation
- Pre-seed PDP Hero rendert 0 h1
- Brand-Token taupe-on-cream Color-Contrast WCAG AA

Vor Squash-Merge: nochmal alle Phase-3-deferrals durchgehen, ob
Komplettheit OK.

#### §6 TODO_AUTHOR-marker review status

~15 distinct editorial decisions in `scripts/metafields-manifest.ts`
unchanged seit 2026-05-11. Status: Aleks-Queue. PDP rendert mit
Pre-Seed-Fallbacks, blockiert nicht.

#### §7 Phase-3-Status documentation

Nach PR-#12-Merge: dieses Memo wird ergänzt um „Was wurde gemerged"-
section. Plus: Update `handoff-phase-LATEST.md` Pointer (nach Phase
abgeschlossen, evtl. Phase 4 startet ggf. mit PR #13 für die noch nicht
geshipten Phase-3-Items wie EU-Widerruf-Belehrung-Surfaces — oder
Phase 4 startet direkt mit Cart-Drawer).

### Pending nach PR #12

- **Aleks editorial seeding** der ~15 TODO_AUTHOR-Felder im manifest
  (blockiert `seed-metafield-values.ts` und damit echte Quote-Renderings
  auf PDP).
- **EditorialEssays Postgres-Migration** auf Railway-Production (polish-
  list-item).
- **Phase-4-Scope** — Cart-Drawer + Shopify-Cart-Sync (Task #5 from
  MEGAPROMPT, makes AddToCartButton stub functional).
- **Phase-5-Scope** — `/editionen` listing route, `/bibliothek`,
  `/werkstatt`, `/stimmen` (resolves the RSC-Prefetch-404er).
