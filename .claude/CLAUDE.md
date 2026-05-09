# CLAUDE.md — Project Context for Claude Code Sessions

This file is loaded automatically into every Claude Code conversation in this repo.
**Source of truth for everything below is `docs/MEGAPROMPT.md`** — when this file
contradicts the canonical docs, follow the canonical docs and update this file.

---

## Project

SILBE is an editorial commerce brand (Wien, AT) selling kuratierte Kunstdrucke
of quotes from five German-language classics: **Rainer Maria Rilke, Franz Kafka,
Thomas Mann, Stefan Zweig, Marie von Ebner-Eschenbach**. Domain: silbe.at.

The Lasker-Schüler edition was archived in May 2026 — never reintroduce it.

The store is migrating from a Liquid-themed Shopify storefront to this headless
build. Old URLs must 301 to new ones (already wired in `apps/silbe/next.config.ts`).

## Architecture — Triadic Stack

```
Next.js 16 (apps/silbe)  ←  presentation, ISR, RSC-first
        │
        ├──→  Shopify Storefront API  ←  catalog, prices, cart, checkout
        │     (revalidateTag-based ISR, see lib/shopify.ts)
        │
        ├──→  Payload 3.0 (@payloadcms/next, Postgres on Railway)
        │     ←  editorial content: Bibliothek essays, Stimmen pages,
        │        Pages collection (e.g. homepage editorial-letter)
        │
        └──→  Gelato (Phase 7)  ←  print-on-demand fulfillment
```

Klaviyo handles newsletter (Phase 5). Cookiebot handles consent (Phase 6).

## Critical Rules — never relax under pressure

These are not stylistic preferences. Many are legal/UWG constraints.

1. **Vocabulary.** `docs/vocabulary.md` is canonical. The forbidden-phrase list in
   §7 is enforced by `apps/silbe/scripts/content-lint.ts` and runs in CI.
   Common pitfalls:
   - Never `limitiert` / `Limited Edition` / `handgesetzt` / `handnummeriert` /
     `Edition X / Y` — UWG-angreifbar at print-on-demand.
   - Never `Buettenpapier` / `Büttenpapier` — Gelato uses Premium-Naturpapier.
   - Never `Subscription` / `Cancellation Policy` — kein Abo, no English legalese.
   - Replacement values: `Hochweißes Premium-Papier, 200 g/m², matt, säurefrei`,
     `3–6 Werktage`, `Gedruckt in der EU, überwiegend in Deutschland`,
     `fünf Stimmen`. Keep these strings byte-identical across all surfaces.
2. **Tokens.** `docs/brand-tokens.md` is canonical and mirrored in
   `apps/silbe/lib/tokens.ts`. No inline hex values, no off-palette colors. Hover
   and disabled states come from `color-mix()`, not separate hex literals.
3. **Sie-Form, never Du-Form.** Original quote-text is the only exception.
4. **German quotes.** `„…"` (deutsche Anführungszeichen) for quotes, `›…‹`
   (Guillemets) for Werktitel. Never US-style `"…"` or French `«…»`.
5. **Mobile-first.** Build at 393×852 (iPhone 14 Pro) first; desktop is the
   extension, not the baseline.
6. **RSC-first.** Server Components by default. `'use client'` only when a
   component needs interactivity, browser APIs, or hooks.
7. **Photography.** Real SILBE posters composited onto AI-generated backdrops
   only — never AI-rendered text or AI-rendered hands. See `docs/asset-mapping.md`.
8. **Performance budgets.** Lighthouse Performance ≥ 90 mobile, A11y ≥ 95,
   LCP ≤ 2.0s mobile, CLS < 0.05. Pinned in `apps/silbe/lighthouse-budget.json`.

## Repo Structure

```
brainsells-headless/
├── apps/
│   └── silbe/                  ← Next.js 16 storefront (THE app)
│       ├── app/                ← App Router routes + layout + globals.css
│       ├── components/         ← UI components (created from Phase 1 onward)
│       ├── lib/                ← shopify.ts, tokens.ts, asset-manifest.ts
│       ├── scripts/            ← import-bundle, import-brain-assets,
│       │                         content-lint
│       ├── public/             ← imported assets (mockups, og, brand,
│       │                         products, authors, stimmen, werkstatt,
│       │                         textures)
│       ├── lighthouse-budget.json
│       └── .env.example
├── packages/
│   └── ui/                     ← skeleton, populated in Phase 2 multi-brand
│                                  extraction. Don't touch in earlier phases.
├── docs/                       ← canonical specs (DO read before each phase)
│   ├── MEGAPROMPT.md           ← phase-by-phase implementation contract
│   ├── brand-tokens.md         ← colors, typography, spacing, motion
│   ├── vocabulary.md           ← wording, forbidden phrases, German quotes
│   ├── asset-mapping.md        ← which asset lives where, what to regenerate
│   └── setup-status.md         ← live config snapshot (ENV, Shopify scopes, etc.)
└── .claude/
    ├── CLAUDE.md               ← THIS FILE
    └── handoff-phase-N.md      ← end-of-phase memos (created at phase close)
```

## Workflow

- **One branch per phase.** Naming: `phase-{N}-{slug}` (e.g. `phase-1-layout`).
  Branch from `main`, commit follows MEGAPROMPT §N.5 message format, PR into
  `main`, squash-merge.
- **HITL gate at every phase boundary.** Vercel Preview must render before
  squash-merge. The user holds the merge approval.
- **Hand-off memo per phase.** At phase close, write `.claude/handoff-phase-N.md`
  capturing: outcomes, deviations from spec, follow-ups, Phase N+1 entry points.
- **Pause-and-report at major sub-steps.** When a phase has multiple surfaces
  (header / footer / drawer in Phase 1), report after each so the user can
  redirect early.
- **Acceptance tests are gates, not suggestions.** §N.4 must pass before commit.
  Document any deviation explicitly in the commit body.
- **Carry-overs flow forward.** Items deferred from a phase enter the next
  phase's task list and are addressed before new scope.

### Latest Phase Hand-off

Always read `.claude/handoff-phase-LATEST.md` at session start — it's the
single source of truth for the most recent memo.

- **Phase 2** (homepage: hybrid hero, trust-bar, fünf stimmen, featured
  editions, werkstatt teaser, editorial letter, bibliothek teaser): see
  `.claude/handoff-phase-2.md`. PR #5 (`c6c679e`). Companion build-pipeline
  hotfixes shipped as PRs #6 (`f099b61`, turbo.json env), #7 (`6e283ac`,
  GitHub Actions env), #8 (`2bb8c47`, Playwright args forwarding).
- **Phase 1.5b** (payload bootstrap): see `.claude/handoff-phase-1.5b.md`.
  PR #4 (`2de0ab8`).
- **Phase 1.5a** (playwright scaffolding + CI): see
  `.claude/handoff-phase-1.5a.md`. PR #3 (`8d5c741`).
- **Phase 1** (layout: header, footer, mobile drawer, fonts): see
  `.claude/handoff-phase-1.md`. PR #2 (`82dcb34`).
- **Phase 0** (setup, tokens, bundle, content-lint, redirects): merged in
  PR #1 (`a3c7c0f`). No memo.
- Future memos: `.claude/handoff-phase-N.md`. Update
  `handoff-phase-LATEST.md` to point at the new memo at phase close.

## Windows Path Note

Repo lives at `C:\Users\Administrator\Developer\brainsells-headless\`.

The Windows account name is historically `Administrator`; the human display
name is `Merlin`. Never assume `C:\Users\Merlin\…` — that path does not exist.
Use absolute paths in scripts (`__dirname`, `path.resolve(...)`), not hard-coded
user paths. Where a script *must* default to a user-profile path (e.g.
`scripts/import-bundle.ts` falling back to the `Downloads/` bundle), keep it
overridable via env var.

External resources Claude Code may need:
- Brain repo: `C:\Users\Administrator\Developer\brainsells-brain\` (read-only
  source for SKU posters, logos, author portraits, favicon).
- Creatives bundle: `C:\Users\Administrator\Downloads\silbe-creatives-bundle-2026-05-06\`.

## How to Start a Session

1. Read this file (auto-loaded).
2. Read `docs/setup-status.md` for the current config snapshot.
3. Read the relevant `docs/MEGAPROMPT.md` phase section.
4. Read the latest `.claude/handoff-phase-N.md` if mid-stream.
5. Then propose tasks and proceed.
