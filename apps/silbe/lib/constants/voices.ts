// Canonical and archived editorial voices for SILBE.
//
// Five canonical voices ship in Phase 2+. Two voices are deprecated and
// must never render on any surface (PDP / Stimmen / Bibliothek / Sitemap
// / AI-Catalog / OG-Cards). Drift is caught at compile-time via the
// CanonicalVoice type, and at runtime via assertCanonicalVoice().
//
// Shared across:
//   - Shopify metafield manifest (scripts/metafields-manifest.ts)
//   - Payload EditorialEssays collection (productHandle ↔ voice)
//   - generateStaticParams in editionen/[handle], stimmen/[voice]
//   - Sitemap (Phase 5)
//   - AI/MCP catalog pipeline
//
// Source of truth: Creative-Audit 2026-05-11. Lasker-Schüler archived
// May 2026; Tucholsky never shipped.

export const CANONICAL_VOICES = [
  'rilke',
  'kafka',
  'mann',
  'zweig',
  'ebner-eschenbach',
] as const;

export const ARCHIVED_VOICES = [
  'lasker-schueler',
  'tucholsky',
] as const;

export type CanonicalVoice = (typeof CANONICAL_VOICES)[number];
export type ArchivedVoice = (typeof ARCHIVED_VOICES)[number];

export function isCanonicalVoice(slug: string): slug is CanonicalVoice {
  return (CANONICAL_VOICES as readonly string[]).includes(slug);
}

export function isArchivedVoice(slug: string): slug is ArchivedVoice {
  return (ARCHIVED_VOICES as readonly string[]).includes(slug);
}

export function assertCanonicalVoice(slug: string): asserts slug is CanonicalVoice {
  if (!isCanonicalVoice(slug)) {
    const archived = isArchivedVoice(slug) ? ' (ARCHIVED — must not render)' : '';
    throw new Error(
      `Voice "${slug}" is not canonical${archived}. ` +
        `Canonical voices: ${CANONICAL_VOICES.join(', ')}.`,
    );
  }
}

// Mapping voice slug → full author name. Used for JSON-LD author field,
// PDP source captions, and metafield author_full_name derivation.
// Lifetime / lifespan strings for the Stimmen-page hub live in a future
// VOICE_BIO module (Phase 5).
export const VOICE_FULL_NAMES: Record<CanonicalVoice, string> = {
  rilke: 'Rainer Maria Rilke',
  kafka: 'Franz Kafka',
  mann: 'Thomas Mann',
  zweig: 'Stefan Zweig',
  'ebner-eschenbach': 'Marie von Ebner-Eschenbach',
};
