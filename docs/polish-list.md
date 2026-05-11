# Polish List

Cosmetic, vocabulary, and UWG-cleanup items deliberately deferred from the
phase they were noticed in. Per project workflow: polish does not happen
mid-phase — it accumulates here and is addressed in dedicated polish sprints
(Phase 2.5, Phase 8 pre-cutover, etc.) so feature work stays bisectable.

Each entry: **owner**, **phase deferred from**, **gate** (which later phase
this must be resolved before), and the actual finding.

---

## Catalog / Shopify

### Legacy SKU cleanup — 15 pre-migration handles still in Shopify catalog

- **Owner:** Aleks (editorial), Merlin (executor)
- **Deferred from:** Phase 3 (PDP)
- **Gate:** must resolve before Phase 8 (cutover from Liquid storefront)
- **Decision needed:** archive in Shopify Admin, or migrate values into the
  13 Phase-2-canonical SKUs?

Phase 3's metafield-verify pass (`scripts/check-metafields.ts`) surfaced 28
products in the live Shopify catalog. Asset-mapping.md §2.3 only lists 13
canonical SKUs (`silbe-*` and `bundle-*` prefix). The remaining 15 use the
old Liquid-era naming convention with format-in-handle:

```
rilke-a3-habegeduld
rilke-a3-wereinmal             ← exists as poster file, no entry in §2.3
ee-a3-feiger
ee-a3-wernichtsweiss
ee-a3-inderjugend
mann-a3-einsamkeit
kafka-a2-imkampf
kafka-a3-dieaxt
zweig-a2-memorial
kafka-tote-milena
mann-tote-einsamkeit
dreibriefe-3er
muttertag-bundle
klassiker-bibliothek-bundle
lese-bundle
postkarten-geschenk-bundle
```

Phase 3 ships with a hardcoded whitelist in `generateStaticParams` reading
the 13 canonical handles from `asset-mapping.md §2.3`. Legacy handles 404
on the new headless storefront until this list is resolved.

**Phase 7/8 dependency:** the 301-redirect map in `next.config.ts` (or an
archive-page route) must cover any legacy handle that is being kept "for
SEO" before cutover. See `.claude/handoff-phase-3.md` §404-Handling for
the full carry-forward.

---

## Brand assets

### Brand-Asset Replacement (Liquid Theme silbe.at)

- **Owner:** Aleks
- **Deferred from:** N/A (parallel)
- **Gate:** Vor Phase 8 Cutover

KILL-markierte Assets aus Creative-Audit 2026-05-11:

- `brand-social-avatar-1000.png` (off-token, stale messaging)
- `brand-email-signature-600.png` (off-token, stale messaging)
- `brand-apple-touch-180.png` (off-token, stale messaging)

Bei Replacement: Liquid-Theme-References prüfen (Header-Logo, Apple-Touch-Icon in `theme.liquid` head, OG-Default-Image in `theme.liquid` Open Graph). Phase 8 Cutover muss alle drei vor DNS-Switch verifizieren.

---

## Layout & components

### Phase 2 — Footer wordmark HOT 2 Gold variant still in `public/brand/`

- **Owner:** Merlin
- **Deferred from:** Phase 2
- **Gate:** Phase 5 (Stimmen/Bibliothek/Werkstatt) or later — non-blocking
- **Finding:** Header switched to `cream`, footer to `cream-on-charcoal`.
  The `gold` variant lives unused in `public/brand/` but may suit
  gift-card mockups or holiday surfaces. Retire or keep — Aleks-decision.

### Phase 2 — Component primitives partial extraction

- **Owner:** Merlin
- **Deferred from:** Phase 2 (carried into Phase 3 partial)
- **Gate:** multi-brand `packages/ui/` pull-out (Phase 2 multi-brand or later)
- **Finding:** Phase 3 extracts only `<CapsLabel>` (recurs identically
  ≥ 4× on PDP). `<SectionHeading>` and `<EyebrowLabel>` still inline because
  each surface needs subtle variant — premature to canonicalize API now.
