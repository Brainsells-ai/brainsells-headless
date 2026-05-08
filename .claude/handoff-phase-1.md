# Hand-off — Phase 1 (Layout System)

**Status:** committed `af2f4d0` on `phase-1-layout`, PR #2 open against `main`.
**Vercel HITL gate:** preview deploy of `phase-1-layout` must render before squash-merge.

---

## What landed

Source of truth: `docs/MEGAPROMPT.md §PHASE 1`. Implementation lives in
`apps/silbe/`.

### Structural

- `app/layout.tsx` — Cormorant Garamond + Crimson Pro + Inter via
  `next/font/google` (display: swap, latin-ext subset). Brand metadata
  (title template, OG defaults, locale `de_AT`, `lang="de-AT"`). Header +
  Footer mounted at the root.
- `app/globals.css` — added `.silbe-mobile-only` / `.silbe-desktop-only`
  responsive utilities (768px breakpoint).
- `app/page.tsx` — Phase 1 holding page (Sie-form, German, brand fonts).
  **Phase 2 replaces this entirely.**

### Components (all under `components/`)

- `layout/Header.tsx` — sticky 64px, hairline-bottom, 3-col grid (mobile:
  hamburger / wordmark / cart, desktop: wordmark / nav / cart). Server
  Component; the only client island it embeds is `MobileDrawer`.
- `layout/Footer.tsx` — charcoal background, gold-on-charcoal HOT 2
  wordmark, four columns (Editionen / Stimmen / Werkstatt / Rechtliches),
  manifest paragraph verbatim from `docs/vocabulary.md §9`, copyright
  with UID, newsletter slot (UI-only).
- `layout/MobileDrawer.tsx` — `'use client'`. role=dialog aria-modal,
  focus trap, ESC + click-outside + overlay close, body scroll-lock with
  restore, focus return to trigger on close. 320ms ease-out transform;
  reduced-motion already neutralized via the global rule.
  Progressive disclosure for Stimmen (5 author detail links + "Alle
  Stimmen →" hub). Owns the hamburger trigger.
- `layout/Wordmark.tsx` — Image-based, three variants (`ink` / `cream` /
  `gold`) backed by HOT 2 transparent PNGs.
- `layout/CartIndicator.tsx` — Server Component, lucide `ShoppingBag` +
  burgundy badge, links to `/warenkorb`.
- `ui/Button.tsx` — primary/secondary/tertiary; renders `Link` or
  `<button>` based on `href` prop. 2px border-radius per brand-tokens §4.
- `ui/HairlineDivider.tsx` — 0.5px ink-15% divider helper.

### Carry-overs from Phase 0 — all closed

1. ✅ `pnpm-workspace.yaml` consolidated to repo root with
   `ignoredBuiltDependencies`; `apps/silbe/pnpm-workspace.yaml` deleted.
   Build no longer prints the multiple-lockfile warning.
2. ✅ Geist scaffold replaced by Cormorant + Crimson + Inter wiring in
   `app/layout.tsx`.
3. ✅ `globals.css` font vars (`--font-cormorant`, `--font-crimson`,
   `--font-inter`) now resolved at `<html>`.

---

## Deviations from spec

- **§1.4 acceptance tests #1–#3 deferred to Vercel preview HITL.** The spec
  references `pnpm lhci autorun` and `pnpm playwright test` against test
  suites that aren't part of §1.2's file list. Static + lint + build checks
  pass; visual / interactive / Lighthouse validation is on the preview gate.
- **`MobileNavTrigger.tsx` was a sub-step-1 placeholder.** Sub-step 3
  replaced it with `MobileDrawer.tsx` and deleted the placeholder. The
  Header import surface stayed stable across the swap.
- **Newsletter form is server-rendered with a disabled submit.** Phase 5
  introduces the Klaviyo client island; until then the form action is `""`
  and the button is `aria-disabled="true"` with a `title=` explanation.

---

## Acceptance signals

| signal | result |
|---|---|
| `pnpm build` | ✅ clean, no warnings |
| TypeScript type-check | ✅ |
| `pnpm tsx scripts/content-lint.ts` (full project, 15 targets) | ✅ exit 0 |
| `pnpm tsx scripts/content-lint.ts components/` | ✅ exit 0 |
| Footer route static check (`/widerrufsrecht` ✅, `/widerruf` ❌, `/editionen` ✅, old liquid routes ❌) | ✅ |
| Lighthouse mobile ≥ 90 / a11y ≥ 95 | ⏸ Vercel preview |
| Visual regression | ⏸ Vercel preview |
| Hamburger interactivity | ⏸ Vercel preview |

---

## Follow-ups (carry into Phase 2)

1. **Playwright suite for layout** — `tests/layout.spec.ts` covering:
   - mobile drawer opens / closes / traps focus / restores focus on close
   - footer links resolve to expected routes
   - visual regression snapshots at mobile + desktop
   - Lighthouse-CI config (`lighthouserc.js`) wired to run against
     `pnpm dev` or the Vercel preview URL
2. **Sticky header morph** — §1.3 only requires "Sticky Header" + hairline.
   Header currently sticks but does not shrink/morph on scroll. The morph
   was discussed as a §5 motion bonus (View Transitions API behind
   `@supports`). Defer to Phase 2 polish unless a specific stakeholder asks.
3. **Wordmark sizing** — `Wordmark` uses `width`/`height` props with
   `style={{ height: 'auto', width: 'auto' }}` to keep aspect ratio. Test
   on real preview to confirm the visual sizing matches the desktop nav
   row height (32px for desktop wordmark, 28px for mobile).
4. **`apps/silbe/app/.claude/`** still carries a settings.local.json
   modification from Phase 0; `apps/silbe/.claude/` is also untracked
   from local Claude session permissions. Neither is committed. If we
   want CI-stable permissions for Claude in the silbe app, fold them
   into repo-root `.claude/settings.json`.

---

## Phase 2 entry points

- Branch: `phase-2-homepage` (off `main` after PR #2 squash-merges).
- Read order: `docs/MEGAPROMPT.md §PHASE 2`, `docs/asset-mapping.md §2.1`
  (homepage asset map), `docs/vocabulary.md §6 + §9` (consistency-pflichten
  + manifest).
- Files-to-create: `app/(storefront)/page.tsx`, `components/home/Hero.tsx`,
  `components/home/TrustBar.tsx`, `components/home/FuenfStimmen.tsx`,
  `components/home/FeaturedEditions.tsx`, `components/home/WerkstattTeaser.tsx`,
  `components/home/BibliothekTeaser.tsx`, `components/home/EditorialLetter.tsx`.
- Will replace `app/page.tsx` (move into route group `(storefront)`).
- Featured Editions pulls `collection(handle: "featured")` via the ISR
  pattern in `lib/shopify.ts` (revalidate: 3600 + tags). Webhook-driven
  invalidation lands later — Phase 7.
- Editorial Letter is read from Payload `Pages` collection (slug
  `editorial-letter-homepage`) — but Payload is not yet bootstrapped. Phase
  2 may need a Payload-init micro-step before the Editorial Letter renders
  with real content; simplest is to render an inline German placeholder
  until Payload comes online and gate the live read behind a
  `payload?.find(...)` lookup with a falsy fallback.
- Hero uses `mockups-v3-composites/silbe-rilke-geduld-hero-burgundy-scene-A`
  — already imported as `/mockups/rilke-geduld-hero-burgundy-scene-a.{jpg,webp,avif}`.
- OG images for the homepage live at `/og/five-klassiker-a.png` etc.
  (already imported).

---

## Open questions for the user

- **Sticky header morph** — wanted in Phase 2 polish, or deferred to a
  later style sprint?
- **Playwright scaffolding** — preferred timing: Phase 2 alongside
  homepage tests, or a dedicated `phase-1.5-tests` interlude?
- **Payload bootstrap** — set up the Payload runtime (admin route,
  collections, seed) at the start of Phase 2, or as a separate
  `phase-1.5-payload` branch first?
