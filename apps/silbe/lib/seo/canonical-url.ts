// Single source of truth for absolute SILBE URLs across SEO surfaces
// (JSON-LD schemas, sitemap, canonical/OG metadata).
//
// METADATA_BASE_URL is set in Vercel (https://silbe.at in production). It is
// intentionally NOT NEXT_PUBLIC_* — every consumer (schema builders, sitemap,
// metadata) runs server-side. Fallback to the production origin keeps Preview
// and local builds rendering valid absolute URLs even before the env var is
// wired.

export const SITE_URL = new URL(
  process.env.METADATA_BASE_URL ?? 'https://silbe.at',
);

// Resolve a path ("/", "/editionen", "/editionen/rilke-…") to an absolute URL
// against SITE_URL. `new URL(path, base)` normalises leading slashes and
// collapses accidental doubles, so callers can pass router-style paths verbatim.
export function canonicalUrl(path = '/'): string {
  return new URL(path, SITE_URL).toString();
}
