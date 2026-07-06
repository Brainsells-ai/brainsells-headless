// Two-layer SKU manifest for the silbe.* Shopify Admin metafields.
//
// Layer 1 — BRAND_CONSTANTS: byte-identical to docs/vocabulary.md §5.3 /
// §6, identical across every SKU, spread into each Shopify product. No
// TODO_AUTHOR allowed.
//
// Layer 2 — EDITIONS: per-SKU editorial values. Fields that need Aleks'
// editorial review carry an explicit `{ TODO_AUTHOR: '<reason>' }` shape
// rather than a placeholder string — the seed-values script skips any
// field that is a Todo, leaving it empty in Shopify until resolved.
//
// Vocabulary lint applies to every string value (enforced by
// scripts/content-lint.ts, run in CI):
//   - Deutsche Anführungszeichen U+201E + U+201C (opens low, closes high)
//   - Werktitel in Guillemets U+203A + U+2039 (single-angle)
//   - Umlaute korrekt (ä ö ü ß), niemals ae/oe/ue/ss
//   - UWG-Bans per docs/vocabulary.md §7 — siehe content-lint FORBIDDEN list.

import { type CanonicalVoice } from '../lib/constants/voices';

// ─── Layer 1 ───────────────────────────────────────────────────────────────

export const BRAND_CONSTANTS = {
  paper_gsm: 200,
  print_location: 'EU, überwiegend Deutschland',
} as const;

// Surface-level copy used by PDP MaterialSpecs / CartDrawer. These are NOT
// product metafields — they live in components — but are pinned here so
// the byte-identical canonical strings have one source-of-truth.
// PDP §3.4 Test 2 asserts these on the rendered page.
export const SURFACE_COPY = {
  paper_description: 'Hochweißes Premium-Papier, 200 g/m², matt, säurefrei',
  shipping_duration: '3–6 Werktage',
  shipping_origin: 'Gedruckt in der EU, überwiegend in Deutschland',
  shipping_packaging: 'Versandzylinder aus recyceltem Material',
  // NOTE: free_shipping_threshold removed in Klasse-2 review — string was
  // not anchored in vocabulary.md §6 P0 list. Add back to vocab and here
  // if/when Aleks decides the canonical free-shipping copy.
} as const;

// ─── Todo discriminator ────────────────────────────────────────────────────

export type Todo = { TODO_AUTHOR: string };
export type V<T> = T | Todo;

export function isTodo(value: unknown): value is Todo {
  return typeof value === 'object' && value !== null && 'TODO_AUTHOR' in value;
}

// ─── Layer 2 — SKU manifest ────────────────────────────────────────────────

// Discriminator for PDP-rendering pathway.
//   - 'edition'      → Phase 3 PDP whitelist. Single-voice, single-or-multi-format.
//   - 'postcard_set' → Phase 4 template (Multi-Quote-Render-Pfad). Excluded from Phase 3.
//   - 'bundle'       → Phase 4 template (Multi-Voice-Composition). Excluded from Phase 3.
export type ProductType = 'edition' | 'postcard_set' | 'bundle';

export type SkuManifest = {
  handle: string;
  product_type: ProductType;
  // true → SKU is Active in Shopify and gets shipped to /editionen +
  // generateStaticParams PDP whitelist. false → manifest carries the metadata
  // (TODO_AUTHOR notes, future editorial work) but the SKU is not published
  // yet, so excluding it from CANONICAL_HANDLES prevents 404s in @pdp-smoke
  // tests and empty cards on the listing. Promote to true when Shopify Admin
  // flips the product to Active.
  active: boolean;
  // null permitted only when product_type === 'bundle'. Type-constrained:
  // only canonical voices accepted, archived voices fail at compile time.
  voice: CanonicalVoice | null;
  work_title: V<string>;
  work_year: V<number>;
  quote_full: V<string>;
  // Multi-variant editions (Hero-style SKUs with A3+A2 variants) carry
  // null — Variant.selectedOptions is the canonical SoT (β-strategy, TECH
  // decision Merlin 2026-05-11). Single-variant editions (Goldrahmen,
  // Postkarten-Sets) carry the explicit value pulled from Shopify.
  // PDP reads variant.selectedOptions.find(o => o.name === 'Format').value
  // for display; product-level metafield only fills JSON-LD additionalProperty
  // when present.
  format: V<string | null>;
  dimensions_cm: V<string | null>;
  editorial_essay_handle: V<string>;
  themes: V<readonly string[]>;
  // Free-form notes — TODO_AUTHOR reasons land here for tracking, plus
  // any per-SKU context that doesn't fit a structured field.
  editorial_notes?: string;
};

// 13 Phase-2 manifest SKUs per docs/asset-mapping.md §2.3. The
// CANONICAL_HANDLES whitelist filters this list to product_type
// 'edition' && active === true — non-active entries persist for
// editorial work-in-progress (TODO_AUTHOR notes) but don't ship to
// /editionen or PDP routes until promoted.
export const EDITIONS: readonly SkuManifest[] = [
  // ─── Rilke ─────────────────────────────────────────────────────────────
  {
    handle: 'silbe-rilke-geduld-hero-burgundy',
    product_type: 'edition',
    active: false,
    voice: 'rilke',
    work_title: '›Briefe an einen jungen Dichter‹',
    work_year: 1903,
    quote_full: '„Habe Geduld gegen alles Ungelöste in Ihrem Herzen.“',
    // Multi-variant (A3 + A2). β-strategy: product-level format/dimensions
    // null, Variant.selectedOptions ('A3 (29.7 × 42 cm)' / 'A2 (42 × 59.4 cm)')
    // is SoT.
    format: null,
    dimensions_cm: null,
    editorial_essay_handle: 'rilke-habe-geduld',
    themes: ['Sehnsucht', 'Wien', 'Geduld', 'Brief', 'Sprache'],
  },
  {
    handle: 'silbe-rilke-habegeduld',
    product_type: 'edition',
    active: true,
    voice: 'rilke',
    work_title: '›Briefe an einen jungen Dichter‹',
    work_year: 1903,
    quote_full: '„Habe Geduld gegen alles Ungelöste in Ihrem Herzen.“',
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'rilke-habe-geduld',
    themes: ['Sehnsucht', 'Wien', 'Geduld', 'Brief', 'Sprache'],
  },

  // ─── WEGWERF – NICHT MERGEN ────────────────────────────────────────────
  // Temporary canonical entry for the €0.50 dbg product (Storefront handle
  // dbg-x7k2p, "Test-debug") so /editionen/dbg-x7k2p resolves on a PREVIEW
  // deploy and can be added to the cart → drawer checkout writes
  // _marketing_consent → orders/paid attaches bs_ud. Firewall-proof only.
  // Clones the active rilke edition's editorial fields (real essay/voice so the
  // PDP renders); the actual price/variant come from the Storefront product.
  // This branch (throwaway/dbg-canonical-firewall-test) MUST NEVER merge to
  // main — deleting it removes dbg from CANONICAL_HANDLES with no cleanup.
  {
    handle: 'dbg-x7k2p',
    product_type: 'edition',
    active: true,
    voice: 'rilke',
    work_title: '›Briefe an einen jungen Dichter‹',
    work_year: 1903,
    quote_full: '„Habe Geduld gegen alles Ungelöste in Ihrem Herzen.“',
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'rilke-habe-geduld',
    themes: ['Sehnsucht', 'Wien', 'Geduld', 'Brief', 'Sprache'],
  },

  // ─── Kafka ─────────────────────────────────────────────────────────────
  {
    handle: 'silbe-kafka-axt',
    product_type: 'edition',
    active: true,
    voice: 'kafka',
    work_title: '›Brief an Oskar Pollak‹',
    work_year: 1904,
    quote_full: {
      TODO_AUTHOR:
        'Quote-Text muss byte-identisch zum Poster sein. Üblich „Ein Buch muß die Axt sein für das gefrorene Meer in uns.“ — aber muß vs muss, Vollständigkeit des Satzes, ggf. „in uns“ vs „in uns selbst“ gegen Poster verifizieren.',
    },
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'kafka-axt-gefrorenes-meer',
    themes: { TODO_AUTHOR: 'Themes finalisieren — Vorschlag aus Brand-Knowledge: ["Sprache", "Brief", "Innenwelt", "Bücher", "Prag"]' },
  },

  // ─── Mann ──────────────────────────────────────────────────────────────
  {
    handle: 'silbe-mann-einsamkeit-hero-charcoal',
    product_type: 'edition',
    active: false,
    voice: 'mann',
    work_title: { TODO_AUTHOR: 'Einsamkeit-Quote — Quelle ›Der Tod in Venedig‹ (1912), ›Tonio Kröger‹ (1903) oder anderes? Shopify-Title aktuell „Einsamkeit zeitigt das Originale“ → suggestiert ›Tonio Kröger‹ oder Notizbuch-Quelle.' },
    work_year: { TODO_AUTHOR: 'Werk-Jahr abhängig von Quelle (siehe work_title TODO)' },
    quote_full: { TODO_AUTHOR: 'Konkreter Einsamkeit-Quote-Text — byte-identisch zum Poster. Shopify-Title nutzt „Einsamkeit zeitigt das Originale“ — als Quote-Quelle verifizieren.' },
    // Multi-variant (A3 + A2). β-strategy — see rilke-geduld-hero-burgundy.
    format: null,
    dimensions_cm: null,
    editorial_essay_handle: 'mann-einsamkeit',
    themes: { TODO_AUTHOR: 'Themes finalisieren — Vorschlag: ["Einsamkeit", "Künstler", "Schweigen", "Innenwelt"]' },
  },
  {
    handle: 'silbe-mann-einsamkeit-goldrahmen',
    product_type: 'edition',
    active: false,
    voice: 'mann',
    work_title: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    work_year: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    quote_full: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'mann-einsamkeit',
    themes: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    editorial_notes: 'Goldrahmen-Variante der Hero-Charcoal-Edition. Inhalt identisch, Format/Rahmen unterscheidet sich.',
  },

  // ─── Zweig ─────────────────────────────────────────────────────────────
  {
    handle: 'silbe-zweig-memorial-staubrose',
    product_type: 'edition',
    active: false,
    voice: 'zweig',
    work_title: { TODO_AUTHOR: 'Memorial-Quote-Quelle — ›Sternstunden der Menschheit‹ (1927), ›Die Welt von Gestern‹ (1942), oder Brief/Essay?' },
    work_year: { TODO_AUTHOR: 'Abhängig von work_title' },
    quote_full: { TODO_AUTHOR: 'Konkreter Memorial-Quote — byte-identisch zum Poster' },
    // Multi-variant (A3 + A2) confirmed via check-variants. β-strategy.
    format: null,
    dimensions_cm: null,
    editorial_essay_handle: 'zweig-memorial',
    themes: { TODO_AUTHOR: 'Themes — Vorschlag: ["Erinnerung", "Wien", "Europa", "Verlust"]' },
  },
  {
    handle: 'silbe-zweig-dir-der-du',
    product_type: 'edition',
    active: true,
    voice: 'zweig',
    work_title: '›Brief einer Unbekannten‹',
    work_year: 1922,
    quote_full: { TODO_AUTHOR: 'Spezifischer Quote aus ›Brief einer Unbekannten‹ — byte-identisch zum Poster' },
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'zweig-unbekannte',
    themes: { TODO_AUTHOR: 'Themes — Vorschlag: ["Liebe", "Brief", "Wien", "Erinnerung", "Verschweigen"]' },
  },

  // ─── Ebner-Eschenbach ─────────────────────────────────────────────────
  {
    handle: 'silbe-ee-aphorismus-goldrahmen',
    product_type: 'edition',
    active: false,
    voice: 'ebner-eschenbach',
    work_title: '›Aphorismen‹',
    work_year: 1880,
    quote_full: { TODO_AUTHOR: 'Welcher konkrete Aphorismus aus der Sammlung — byte-identisch zum Poster' },
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'ebner-eschenbach-aphorismus',
    themes: { TODO_AUTHOR: 'Themes hängen vom gewählten Aphorismus ab' },
  },

  // ─── Postkarten 3er-Sets ──────────────────────────────────────────────
  {
    handle: 'silbe-stempel-rilke-postkarten-3er',
    product_type: 'postcard_set',
    active: false,
    voice: 'rilke',
    work_title: { TODO_AUTHOR: 'Postkarten-3er-Set — drei separate Quotes pro Karte. work_title-Strategie: gemeinsamer Werk-Titel falls alle aus einem Werk, sonst leer-lassen + Karten-Liste in editorial_notes' },
    work_year: { TODO_AUTHOR: 'Abhängig von work_title-Strategie' },
    quote_full: { TODO_AUTHOR: 'Drei Quotes — Strategie: Quote-Text leer, Liste in editorial_notes? Oder Haupt-Quote der prominentesten Karte?' },
    format: 'Postkarten-3er',
    dimensions_cm: { TODO_AUTHOR: 'Postkarten-Standardmaß — A6 (10.5 × 14.8) oder DIN-lang (10.5 × 21)?' },
    editorial_essay_handle: 'rilke-postkarten-3er',
    themes: { TODO_AUTHOR: 'Aggregierte Themes der drei Karten' },
    editorial_notes: 'Postkarten-3er-Set. Quote-Feld-Strategie auf Bundle-Ebene vor Phase 3 PDP-Build klären (Multi-Quote vs Repräsentativ-Quote).',
  },
  {
    handle: 'silbe-stempel-kafka-postkarten-3er',
    product_type: 'postcard_set',
    active: false,
    voice: 'kafka',
    work_title: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    work_year: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    quote_full: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    format: 'Postkarten-3er',
    dimensions_cm: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    editorial_essay_handle: 'kafka-postkarten-3er',
    themes: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    editorial_notes: 'Postkarten-3er-Set. Quote-Feld-Strategie auf Bundle-Ebene vor Phase 3 PDP-Build klären.',
  },
  {
    handle: 'silbe-stempel-zweig-postkarten-3er',
    product_type: 'postcard_set',
    active: false,
    voice: 'zweig',
    work_title: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    work_year: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    quote_full: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    format: 'Postkarten-3er',
    dimensions_cm: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    editorial_essay_handle: 'zweig-postkarten-3er',
    themes: { TODO_AUTHOR: 'Siehe silbe-stempel-rilke-postkarten-3er' },
    editorial_notes: 'Postkarten-3er-Set. Quote-Feld-Strategie auf Bundle-Ebene vor Phase 3 PDP-Build klären.',
  },

  // ─── Bundles (Multi-Voice) ────────────────────────────────────────────
  {
    handle: 'bundle-goldrahmen-trio',
    product_type: 'bundle',
    active: false,
    voice: null,
    work_title: { TODO_AUTHOR: 'Bundle umfasst 3 Editionen — voice + work-Strategie: leer (bundle-Marker), oder Repräsentativ-Voice für Search/JSON-LD?' },
    work_year: { TODO_AUTHOR: 'Bundle hat kein einzelnes Jahr' },
    quote_full: { TODO_AUTHOR: 'Bundle hat kein einzelnes Quote — leer, oder kuratierte „Sammlung von …“-Caption?' },
    format: 'Bundle',
    dimensions_cm: { TODO_AUTHOR: 'Bundle-Dimensionen-Strategie — pro Einzelteil A3, oder „3 × A3“?' },
    editorial_essay_handle: { TODO_AUTHOR: 'Bundle braucht eigenen Editorial-Essay? Oder verlinkt zu Einzel-Essays?' },
    themes: { TODO_AUTHOR: 'Aggregierte Themes der 3 Bundle-Editionen' },
    editorial_notes:
      'Multi-Voice-Bundle: Goldrahmen-Trio. Komposition (welche 3 Editionen) muss bestätigt werden. ' +
      'voice=null markiert Bundle-SKU; Phase-3-PDP rendert Bundles über separaten Template-Pfad oder fällt auf Standard-PDP mit reduziertem Metafield-Set.',
  },
  {
    handle: 'bundle-stempel-sammler',
    product_type: 'bundle',
    active: false,
    voice: null,
    work_title: { TODO_AUTHOR: 'Bundle umfasst mehrere Postkarten-Sets — siehe bundle-goldrahmen-trio' },
    work_year: { TODO_AUTHOR: 'Bundle hat kein einzelnes Jahr' },
    quote_full: { TODO_AUTHOR: 'Bundle hat kein einzelnes Quote' },
    format: 'Bundle',
    dimensions_cm: { TODO_AUTHOR: 'Bundle-Dimensionen-Strategie' },
    editorial_essay_handle: { TODO_AUTHOR: 'Bundle-Essay-Strategie' },
    themes: { TODO_AUTHOR: 'Aggregierte Themes' },
    editorial_notes:
      'Multi-Voice-Bundle: Stempel-Sammler (Postkarten-Sammlung). Komposition unklar. ' +
      'Bundle-PDP-Strategie siehe bundle-goldrahmen-trio.',
  },
] as const;

// Whitelist for generateStaticParams. Filters EDITIONS on TWO axes:
//   - product_type === 'edition' (postcard_set + bundle need dedicated
//     render templates, deferred Phase-4 follow-ups)
//   - active === true (the SKU is Active in Shopify and ready to ship —
//     non-active SKUs carry TODO_AUTHOR metadata for future editorial
//     work but render as 404 since Shopify has no product for them)
//
// 2026-05-19 MVP state: 3 active editions
// (silbe-rilke-habegeduld, silbe-kafka-axt, silbe-zweig-dir-der-du).
// Flip active: true on a manifest entry to publish — no separate
// allowlist to maintain.
export const CANONICAL_HANDLES: readonly string[] = EDITIONS
  .filter((e) => e.product_type === 'edition' && e.active === true)
  .map((e) => e.handle);

// Full unfiltered handle list — used by validation scripts and seed-values
// which still write metafields for non-edition SKUs (the values themselves
// inform JSON-LD agentic-discovery even when PDP rendering is deferred).
export const ALL_CANONICAL_HANDLES: readonly string[] = EDITIONS.map((e) => e.handle);
