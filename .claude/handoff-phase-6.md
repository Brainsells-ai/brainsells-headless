# Hand-off — Phase 6 (`not-found` · `/editionen` · `VariantSelector`)

**Status:** Phase 6 closed on 2026-05-13. 3 PRs opened from `merlin/phase-6-*` branches against `main`, all gates green, ready for sequential merge:

| PR | Squash target | Files | LOC | Inhalt |
|---|---|---|---|---|
| [#18](https://github.com/Brainsells-ai/brainsells-headless/pull/18) | tbd | 3 | +129 | P1 — SILBE-branded `not-found.tsx` + `[...notFound]` catch-all + e2e |
| [#19](https://github.com/Brainsells-ai/brainsells-headless/pull/19) | tbd | 3 | +296 | P2 — `/editionen` listing route + `getAllEditionsSummary()` + e2e |
| [#20](https://github.com/Brainsells-ai/brainsells-headless/pull/20) | tbd | 3 | +283/-24 | P3 — `VariantSelector` PDP island (A3/A2) + e2e |

Recommended merge order: **#18 → #19 → #20** (logical build order — P1's 404 CTA points at P2's `/editionen`; P3 is independent). No file overlap between the 3 PRs; any merge order works technically.

---

## Was wurde gebaut

### P1 — `not-found.tsx` (PR #18)

`apps/silbe/app/(frontend)/not-found.tsx` + `apps/silbe/app/(frontend)/[...notFound]/page.tsx`. Editorial-Wink-Copy "404 — eine Edition, die wir nicht drucken." (Cormorant italic) + Crimson body + Inter `→ Zu den Editionen` CTA in Burgundy auf Cream. Catch-all routet jede unmatchte URL durch den `(frontend)`-Tree, damit das Route-Group-`not-found.tsx` mit voller Chrome (Header + Footer + CartDrawer) rendert.

**Technische Begründung Catch-all:** Multi-Root-Layout-Setup (`(frontend)/layout.tsx` + `(payload)/layout.tsx` als sibling-Roots, kein `app/layout.tsx`) fällt sonst auf Next.js' built-in 404-Default zurück. Catch-all-Specificity bewahrt `(payload)/admin/*`-Routing (Static-Segments gewinnen vor Catch-all).

Ersetzt damit auch implizit den `/warenkorb`-Stub (no-route-by-design — Cart-Flow öffnet Drawer, keine Page).

### P2 — `/editionen` Listing (PR #19)

`apps/silbe/app/(frontend)/editionen/page.tsx` — Collection-Grid aller 8 kanonischen Edition-SKUs in Manifest-Order (Rilke → Kafka → Mann → Zweig → Ebner-Eschenbach). ISR mit `revalidate=3600` (matches PDP-Profil). CapsLabel + Cormorant-italic-H1 *„Alle Editionen."* + Crimson-Intro über dem Grid. Karten reusen die `FeaturedEditions`-Visual-Sprache (3/4-Cover · Cormorant-Title · Inter-Price+Hint in Taupe).

**Neuer Read-Path:** `getAllEditionsSummary()` in `apps/silbe/lib/shopify-queries.ts` — fetched via `products(first: 50, sortKey: TITLE)`, filtert nach `CANONICAL_HANDLES` (defense against catalog drift), re-sortiert nach `EDITIONS`-Manifest-Position. `SummaryProduct`-Shape erweitert um `formatOptions: string[]` für Varianten-Hint (*„A3 · A2"* für Hero-Multi-Variant, *„A3"* für Goldrahmen, omitted wenn kein Format-Option). Hint stripped die Dimensions-Parenthese (Dimensions gehören auf die PDP).

Löst das P1-404-CTA-Ziel — der Editionen-Link loopt nicht mehr zurück zur 404.

### P3 — `VariantSelector` PDP-Insel (PR #20)

`apps/silbe/components/product/VariantSelector.tsx` — Client-Insel die die Format-Button-Reihe + Current-Variant-Preis + `AddToCartButton` auf der PDP besitzt. URL `searchParams` (`?variant=A3` / `?variant=A2`) ist die kanonische Source-of-Truth; kein interner Selection-State.

`Hero.tsx` wrapped die Insel in `<Suspense>` mit Default-Variant-Fallback — `useSearchParams` würde sonst die gesamte PDP-Route aus Static-Rendering opt-outen. SSR emittiert den Fallback (default = `product.variants[0]`); Client-Hydration re-reads die URL und swappt zum requested Variant. Deep-Links (`?variant=A2`) funktionieren nach Hydration.

Single-Variant-Editions (Goldrahmen, Postkarten-Sets) rendern keinen Selector — Fieldset ist conditional auf `variants.length > 1 AND every variant has Format option`. `AddToCartButton` bleibt in allen Fällen sichtbar (Cart-Row rendert unconditionally innerhalb der Insel).

URL-Key stripped die Dimensions-Parenthese (`"A3 (29.7 × 42 cm)"` → `?variant=A3`); volles Label preserved im `aria-label` für Screen-Reader.

---

## Architektur-Entscheidungen fixiert in Phase 6 (TECH, locked 2026-05-13)

Phase-7+ Arbeit muss diese respektieren oder explizit revidieren.

- **`(frontend)/not-found.tsx` + Catch-all-Pattern für 404-Chrome.** Solange `app/layout.tsx` als Root fehlt (Payload + Frontend als sibling-Roots), bleibt der Catch-all-Trick die canonical Lösung für SILBE-Branded-Unmatched-URLs. Alternative wäre Layout-Restructure (out-of-scope, würde Payload-Chrome brechen).
- **404-CTA targets `/editionen`.** Nicht Homepage. Bewusste Entscheidung: nach 404 ist die Listing-Route der nützlichste Recovery-Punkt.
- **`/editionen` rendert Manifest-Order, nicht Shopify-Sort.** `EDITIONS`-Array in `scripts/metafields-manifest.ts` ist editorial SoT — Shopify-`TITLE`-Sort ist nur Determinismus für den Fetch. List wird via `CANONICAL_HANDLES`-Index re-sortiert.
- **`CANONICAL_HANDLES`-Filter als Defense.** Falls der Shopify-Katalog non-`edition`-SKUs zugefügt bekommt (Postcards, Bundles), leaken sie nicht ins Listing. Selbe Whitelist wie PDP `generateStaticParams`.
- **Format-Hint auf Listing-Karten zeigt nur den Key, nicht Dimensions.** *„A3 · A2"* statt *„A3 (29.7 × 42 cm) · A2 (42 × 59.4 cm)"*. Dimensions gehören auf die PDP.
- **URL ist die einzige SoT für VariantSelector.** Kein `useState` im Component. `useSearchParams` liest, `router.replace` schreibt. Folge: Deep-Links shareable.
- **Suspense bewahrt PDP-SSG.** Pattern `<Suspense>` um Client-Component mit `useSearchParams` ist mandatory in Next.js 16, sonst opt-out aus Static.
- **`AddToCartButton` lives inside the variant island.** Vorher in Hero direkt, hardcoded auf `defaultVariant`. Jetzt liest immer die *selected* Variant — Single-Variant-Editions kriegen den CTA unconditionally, Multi-Variant-Editions kriegen ihn variant-spezifisch.
- **Button + `aria-pressed`-Toggle-Pattern für Variant-Picker**, nicht `<input type=radio>`. Matches Shopping-UI-Convention; identische A11y-Semantik mit explizitem `aria-pressed`.

## Acceptance gates (pre-merge, alle grün)

- ✅ `pnpm exec tsc --noEmit` clean (alle 3 PRs)
- ✅ `pnpm lint:content` 60 targets (was 59 vor P1 — `not-found.tsx` zählt jetzt mit)
- ✅ `pnpm build` 14–15 Routes:
  - PR #18: 14 routes + `/[...notFound]` Dynamic
  - PR #19: 15 routes (+ `/editionen` Static, ISR 1h/1y)
  - PR #20: 14 routes (alle 8 PDP-Handles bleiben SSG-prerendered, Suspense brach Static nicht)
- ✅ Playwright suite (cumulative): 90/90 nach allen 3 Merges (Phase-5 baseline 72 + 4 P1 + 4 P2 + 10 P3)

## Smoke-Tests pre-merge

Lokale Smoke (no Playwright MCP this PR — logic-only assertions):

**P1:**
- `/this-route-does-not-exist` → 404 status, SILBE-Branding-Heading rendert, CTA → `/editionen`, Header + Footer + CartDrawer chrome inheritance
- `/warenkorb` → selbes SILBE-404 (vorher Next-Default)
- `@pdp-negative` 404-Tests in `pdp.spec.ts` (`/editionen/legacy-handle`, `totally-fake`, `bundle handle`) → bleiben grün (status 404 preserved durch Catch-all)

**P2:**
- `/editionen` → 200, 8 Karten in Manifest-Order, jede mit Cover + Title + Price + Format-Hint
- Klick auf jede Karte → resolved zur existierenden PDP
- Mobile 2-col-Grid, Desktop 4-col (`silbe-featured-grid` CSS)

**P3:**
- `/editionen/silbe-rilke-geduld-hero-burgundy` → A3 + A2 Button-Reihe, A3 default pressed
- Klick A2 → URL wird `?variant=A2`, A2 pressed, A3 unpressed
- Reload mit `?variant=A2` → A2 nach Hydration selected
- `/editionen/silbe-rilke-geduld-goldrahmen` → kein Format-Selector, CTA present
- Add-to-Cart from selected variant → korrektes `variantId` im Cart-Drawer

## Polish-list deltas added in Phase 6

7 neue Einträge in `docs/polish-list.md § Phase 6`:

- VariantSelector hydration-flash auf direct-Deep-Link (~50-200ms A3→A2 swap)
- `formatPrice` Duplikation across Hero, FeaturedEditions, editionen-listing, VariantSelector (4 Callsites)
- Stale `.next/dev/types/validator.ts` cache bei Branch-Switches mit verschiedenen Routes (Turbopack-Pitfall — `Remove-Item -Recurse -Force '.next'` als Workaround)
- Variant-aware OG-Image / JSON-LD / canonical metadata (PDP `generateMetadata` ignoriert aktuell `?variant=`)
- Multi-Option-Support beyond Format (`findFormatOption` hardcoded auf `name === 'format'` — Color/Frame würde Generalisierung brauchen)
- ISR-Tagging für `/editionen` — currently `tags: [SHOPIFY_TAGS.products]` only; könnte per-listing-tag invalidieren wenn Catalog wächst
- `getFeaturedEditions()` returnt nun auch `formatOptions`, ungenutzt auf Homepage (kleiner GraphQL-Payload-Overhead, kein Behavior-Change)

2 Phase-vor-6-Einträge als RESOLVED markiert:
- Phase 0 § "Custom 404-Page mit SILBE-Branding" — resolved P1
- Phase 3 § "VariantSelector — A3/A2 Picker für Multi-Variant SKUs" — resolved P3

## Pending Aleks-Actions vor Production-Deploy

**Aus Phase 5 carryover (unverändert):**
1. Klaviyo-Liste anlegen + Double-Opt-In aktivieren + Bestätigungs-Email-Template einrichten
2. Vercel env-Vars setzen: `KLAVIYO_PRIVATE_KEY` + `NEXT_PUBLIC_KLAVIYO_LIST_ID`
3. Klaviyo „From"-Email auf `hallo@silbe.at` setzen
4. (parallel zu Code-Arbeit, nicht-blockierend für Phase 6) DNS für Klaviyo Sending-Domain `send.silbe.at` bei WebGo eintragen — 4 Records, 1–24h Propagation, dann Verifikations-Klick in Klaviyo. Details: `silbe-klaviyo-dns-pending.md` (Memo nicht in Repo aufgetaucht — falls Aleks die parallel angelegt hat, weitermachen wenn DNS propagiert).

**Aus Phase 6 (neu):**
- Keine. Phase 6 ist code-complete und production-deploy-ready unabhängig.

## Carry-forward zu Phase 7

- **Rechtsseiten-Content (7 flache Routes)** — Legal-Sprint mit IT-Recht-Kanzlei. Pfade locked seit Phase 5: `/impressum`, `/agb`, `/datenschutz`, `/widerrufsrecht`, `/widerrufsformular`, `/versand`, `/cookie-einstellungen`. Aktuell 404 by-design — werden mit Phase 6 jetzt aber im SILBE-Branding-404 dargestellt, nicht im Next-Default. Akzeptable Interim-UX.
- **`/ueber-uns` Editorial-Pass** — final copy statt 2-Absatz-Stub (Aleks).
- **`/stimmen` + `/bibliothek` Listing-Routes** — Phase 7+ als eigene Listing-Routes mit Inhalt.
- **Cookiebot Integration** — separater Sprint, getrennt von Klaviyo / GA4 / Meta-Pixel.
- **CH-Geo-Detection** — `FreeShipBar` zone-keyed threshold (€39 DE/AT · €69 CH). `SURFACE_COPY.free_shipping_threshold` re-introduce mit zone-keyed Shape. Out-of-scope für Phase 6 (AT+DE only per User-Spec).
- **MockupCarousel** — Multi-Image PDP-Gallery (Phase-3-deferral, weiterhin offen).
- **ProductJsonLd** — Agentic-Discovery `<script type="application/ld+json">` Block (Phase-3-deferral, Gate Phase 7 oder Phase 8 Cutover).

## Bekannte Probleme (non-blocking)

- **Hydration-Flash auf Variant-Deep-Link.** User die `/editionen/...?variant=A2` direkt öffnen sehen A3 (SSR-Fallback) für ~50–200ms bevor Hydration auf A2 swappt. Acceptable für MVP; sharable URLs work correctly. Polish: Cookie- oder Header-basierte Variant-Resolution würde Flash eliminieren aber pulled die Page aus pure SSG. Out-of-scope.
- **Two-Variant-Editions only.** Hero-SKUs (Rilke-Burgundy, Mann-Charcoal, Zweig-Staubrose) haben A3 + A2. Component handled N Variants generisch aber nur `Format`-Option ist wired. Color oder Frame würden `findFormatOption` Generalisierung brauchen.
- **`formatPrice` ist in 4 Files dupliziert** (Hero, FeaturedEditions, editionen-Listing, VariantSelector). Polish: `lib/format.ts` extract.
- **`getFeaturedEditions()` returnt nun `formatOptions`** obwohl Homepage es nicht rendert. Minimaler GraphQL-Payload-Overhead, kein Behavior-Change.
- **Stale Next.js `.next/dev/types/validator.ts` Cache** über Branch-Switches mit unterschiedlichen Route-Sets blockiert `tsc --noEmit` und `pnpm build` mit Phantom-References. Workaround dokumentiert oben. Würde von Turbopack-Cache-Invalidation auf Branch-Switch profitieren — Next.js-Bug-Class.

## Bug-Spur dieser Phase (R5 Honest)

**P1 Iteration:** Erste `not-found.tsx`-Implementation (nur `app/(frontend)/not-found.tsx`, ohne Catch-all) renderte für unmatchte URLs den Next.js Default-404 statt meine SILBE-Variante. Root-cause: Multi-Root-Layout-Setup (Payload + Frontend als sibling-Roots, kein `app/layout.tsx`) lässt Next.js auf den built-in Default fallback. Pivot: Catch-all `[...notFound]/page.tsx` der `notFound()` ruft → triggert nearest `not-found.tsx` mit korrekter Layout-Chrome. 1 Build + 1 Playwright-Iteration für Pivot.

**P2 Iteration:** Erster e2e-Test `getByRole('heading', { level: 2 })` fand 10 statt 8 Elemente — Footer hat eigene H2s (*„Rechtliches"* + *„Kontakt"*). Fix: scope auf `page.getByRole('main')`. 1 Test-Iteration.

**P3 / Inter-Phase:** `.next/dev/types/validator.ts` persistierte über Branch-Switches und blockierte `tsc` mit Phantom-Referenz auf `[...notFound]/page.js` aus dem P1-Branch (P2-Branch hatte die Datei nicht). Workaround: `Remove-Item -Recurse -Force '.next'` zwischen Branch-Switches. 1 Cache-Wipe-Iteration.

**Lesson für Phase 7+:** Bei Branch-Switches mit unterschiedlichen Route-Sets immer `.next/` wipen bevor Build oder `tsc`. Polish-Backlog-Eintrag dokumentiert.

## Co-Existence / Session-discipline

Diese Phase war Merlin-driven end-to-end (CC harness, plan → read_now() → inventory → build → acceptance gates → diff → commit → PR pro Phase-Item). Aleks reviewed + mergt die 3 PRs sequentiell via GitHub UI. Kein Codex adversarial-review invoked (non-constitutional, non-security, non-Worker scope).

Wall-clock-Session ~100 min für 3 PRs + handoff-doc (dieser file).
