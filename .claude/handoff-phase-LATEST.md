# SILBE Headless — Phase Hand-off

Single rolling reference for the current state of `apps/silbe`. Read this
at the start of any new Claude Code session to know where the project is.
The active phase lives inline below; prior phases are tracked in the table.

---

## Current phase — 7 · Legal Pages

**Branch:** `phase-7-legal-pages` · **PR:** [#22](https://github.com/Brainsells-ai/brainsells-headless/pull/22) · **Status:** open, all gates green · **Opened:** 2026-05-13.

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
| 7 — Legal pages | `phase-7-legal-pages` | #22 | tbd | ⏳ open (PR #22, all gates green) |
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
