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
// Vocabulary lint applies to every string value:
//   - Deutsche Anführungszeichen „…" (U+201E + U+201C)
//   - Werktitel in Guillemets ›…‹ (U+203A + U+2039)
//   - Umlaute korrekt (ä ö ü ß)
//   - Verbotene Begriffe (UWG-Risk): „limitiert", „Limited Edition",
//     „handgesetzt", „handgedruckt", „handnummeriert" — niemals.

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
  free_shipping_threshold: 'ab €39 frei',
} as const;

// ─── Todo discriminator ────────────────────────────────────────────────────

export type Todo = { TODO_AUTHOR: string };
export type V<T> = T | Todo;

export function isTodo(value: unknown): value is Todo {
  return typeof value === 'object' && value !== null && 'TODO_AUTHOR' in value;
}

// ─── Layer 2 — SKU manifest ────────────────────────────────────────────────

export type SkuManifest = {
  handle: string;
  // null = multi-voice bundle. Type-constrained: only canonical voices
  // accepted, archived voices fail at compile time.
  voice: CanonicalVoice | null;
  work_title: V<string>;
  work_year: V<number>;
  quote_full: V<string>;
  format: V<string>;
  dimensions_cm: V<string>;
  editorial_essay_handle: V<string>;
  themes: V<readonly string[]>;
  // Free-form notes — TODO_AUTHOR reasons land here for tracking, plus
  // any per-SKU context that doesn't fit a structured field.
  editorial_notes?: string;
};

// 13 Phase-2-canonical SKUs per docs/asset-mapping.md §2.3. Source of
// truth for generateStaticParams whitelist.
export const EDITIONS: readonly SkuManifest[] = [
  // ─── Rilke ─────────────────────────────────────────────────────────────
  {
    handle: 'silbe-rilke-geduld-hero-burgundy',
    voice: 'rilke',
    work_title: '›Briefe an einen jungen Dichter‹',
    work_year: 1903,
    quote_full: '„Habe Geduld gegen alles Ungelöste in Ihrem Herzen."',
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'rilke-habe-geduld',
    themes: ['Sehnsucht', 'Wien', 'Geduld', 'Brief', 'Sprache'],
  },
  {
    handle: 'silbe-rilke-geduld-goldrahmen',
    voice: 'rilke',
    work_title: '›Briefe an einen jungen Dichter‹',
    work_year: 1903,
    quote_full: '„Habe Geduld gegen alles Ungelöste in Ihrem Herzen."',
    format: { TODO_AUTHOR: 'Goldrahmen-Edition Format/Dimensionen — A3 oder A2? Rahmen-Maße separat?' },
    dimensions_cm: { TODO_AUTHOR: 'Goldrahmen-Edition Format/Dimensionen — A3 oder A2? Rahmen-Maße separat?' },
    editorial_essay_handle: 'rilke-habe-geduld',
    themes: ['Sehnsucht', 'Wien', 'Geduld', 'Brief', 'Sprache'],
  },

  // ─── Kafka ─────────────────────────────────────────────────────────────
  {
    handle: 'silbe-kafka-axt-goldrahmen',
    voice: 'kafka',
    work_title: '›Brief an Oskar Pollak‹',
    work_year: 1904,
    quote_full: {
      TODO_AUTHOR:
        'Quote-Text muss byte-identisch zum Poster sein. Üblich „Ein Buch muß die Axt sein für das gefrorene Meer in uns." — aber muß vs muss, Vollständigkeit des Satzes, ggf. „in uns" vs „in uns selbst" gegen Poster verifizieren.',
    },
    format: { TODO_AUTHOR: 'Goldrahmen-Edition Format/Dimensionen' },
    dimensions_cm: { TODO_AUTHOR: 'Goldrahmen-Edition Format/Dimensionen' },
    editorial_essay_handle: 'kafka-axt-gefrorenes-meer',
    themes: { TODO_AUTHOR: 'Themes finalisieren — Vorschlag aus Brand-Knowledge: ["Sprache", "Brief", "Innenwelt", "Bücher", "Prag"]' },
  },

  // ─── Mann ──────────────────────────────────────────────────────────────
  {
    handle: 'silbe-mann-einsamkeit-hero-charcoal',
    voice: 'mann',
    work_title: { TODO_AUTHOR: 'Einsamkeit-Quote — Quelle ›Der Tod in Venedig‹ (1912), ›Tonio Kröger‹ (1903) oder anderes?' },
    work_year: { TODO_AUTHOR: 'Werk-Jahr abhängig von Quelle (siehe work_title TODO)' },
    quote_full: { TODO_AUTHOR: 'Konkreter Einsamkeit-Quote-Text — byte-identisch zum Poster' },
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'mann-einsamkeit',
    themes: { TODO_AUTHOR: 'Themes finalisieren — Vorschlag: ["Einsamkeit", "Künstler", "Schweigen", "Innenwelt"]' },
  },
  {
    handle: 'silbe-mann-einsamkeit-goldrahmen',
    voice: 'mann',
    work_title: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    work_year: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    quote_full: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    format: { TODO_AUTHOR: 'Goldrahmen-Edition Format' },
    dimensions_cm: { TODO_AUTHOR: 'Goldrahmen-Edition Dimensionen' },
    editorial_essay_handle: 'mann-einsamkeit',
    themes: { TODO_AUTHOR: 'Siehe silbe-mann-einsamkeit-hero-charcoal' },
    editorial_notes: 'Goldrahmen-Variante der Hero-Charcoal-Edition. Inhalt identisch, Format/Rahmen unterscheidet sich.',
  },

  // ─── Zweig ─────────────────────────────────────────────────────────────
  {
    handle: 'silbe-zweig-memorial-staubrose',
    voice: 'zweig',
    work_title: { TODO_AUTHOR: 'Memorial-Quote-Quelle — ›Sternstunden der Menschheit‹ (1927), ›Die Welt von Gestern‹ (1942), oder Brief/Essay?' },
    work_year: { TODO_AUTHOR: 'Abhängig von work_title' },
    quote_full: { TODO_AUTHOR: 'Konkreter Memorial-Quote — byte-identisch zum Poster' },
    format: 'A3',
    dimensions_cm: '29.7 × 42',
    editorial_essay_handle: 'zweig-memorial',
    themes: { TODO_AUTHOR: 'Themes — Vorschlag: ["Erinnerung", "Wien", "Europa", "Verlust"]' },
  },
  {
    handle: 'silbe-zweig-unbekannte-goldrahmen',
    voice: 'zweig',
    work_title: '›Brief einer Unbekannten‹',
    work_year: 1922,
    quote_full: { TODO_AUTHOR: 'Spezifischer Quote aus ›Brief einer Unbekannten‹ — byte-identisch zum Poster' },
    format: { TODO_AUTHOR: 'Goldrahmen-Edition Format' },
    dimensions_cm: { TODO_AUTHOR: 'Goldrahmen-Edition Dimensionen' },
    editorial_essay_handle: 'zweig-unbekannte',
    themes: { TODO_AUTHOR: 'Themes — Vorschlag: ["Liebe", "Brief", "Wien", "Erinnerung", "Verschweigen"]' },
  },

  // ─── Ebner-Eschenbach ─────────────────────────────────────────────────
  {
    handle: 'silbe-ee-aphorismus-goldrahmen',
    voice: 'ebner-eschenbach',
    work_title: '›Aphorismen‹',
    work_year: 1880,
    quote_full: { TODO_AUTHOR: 'Welcher konkrete Aphorismus aus der Sammlung — byte-identisch zum Poster' },
    format: { TODO_AUTHOR: 'Goldrahmen-Edition Format' },
    dimensions_cm: { TODO_AUTHOR: 'Goldrahmen-Edition Dimensionen' },
    editorial_essay_handle: 'ebner-eschenbach-aphorismus',
    themes: { TODO_AUTHOR: 'Themes hängen vom gewählten Aphorismus ab' },
  },

  // ─── Postkarten 3er-Sets ──────────────────────────────────────────────
  {
    handle: 'silbe-stempel-rilke-postkarten-3er',
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
    voice: null,
    work_title: { TODO_AUTHOR: 'Bundle umfasst 3 Editionen — voice + work-Strategie: leer (bundle-Marker), oder Repräsentativ-Voice für Search/JSON-LD?' },
    work_year: { TODO_AUTHOR: 'Bundle hat kein einzelnes Jahr' },
    quote_full: { TODO_AUTHOR: 'Bundle hat kein einzelnes Quote — leer, oder kuratierte „Sammlung von ..."-Caption?' },
    format: 'Bundle',
    dimensions_cm: { TODO_AUTHOR: 'Bundle-Dimensionen-Strategie — pro Einzelteil A3, oder „3 × A3"?' },
    editorial_essay_handle: { TODO_AUTHOR: 'Bundle braucht eigenen Editorial-Essay? Oder verlinkt zu Einzel-Essays?' },
    themes: { TODO_AUTHOR: 'Aggregierte Themes der 3 Bundle-Editionen' },
    editorial_notes:
      'Multi-Voice-Bundle: Goldrahmen-Trio. Komposition (welche 3 Editionen) muss bestätigt werden. ' +
      'voice=null markiert Bundle-SKU; Phase-3-PDP rendert Bundles über separaten Template-Pfad oder fällt auf Standard-PDP mit reduziertem Metafield-Set.',
  },
  {
    handle: 'bundle-stempel-sammler',
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

// Whitelist for generateStaticParams. Same source as EDITIONS — derived
// so the manifest is the single source of truth.
export const CANONICAL_HANDLES: readonly string[] = EDITIONS.map((e) => e.handle);
