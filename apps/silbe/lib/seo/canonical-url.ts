// Single source of truth for absolute SILBE URLs across SEO surfaces
// (JSON-LD schemas, sitemap, canonical/OG metadata).
//
// METADATA_BASE_URL is set in Vercel (https://silbe.at in production). It is
// intentionally NOT NEXT_PUBLIC_* — every consumer (schema builders, sitemap,
// metadata) runs server-side. Fallback to the production origin keeps Preview
// and local builds rendering valid absolute URLs even before the env var is
// wired.
//
// Evaluated lazily per call, not at module import time: scripts that load
// .env.local AFTER importing this module (e.g. register-webhooks.ts) would
// otherwise read the env var before dotenv populated it and silently fall
// back to silbe.at.

function siteUrl(): URL {
  return new URL(process.env.METADATA_BASE_URL ?? 'https://silbe.at');
}

// Resolve a path ("/", "/editionen", "/editionen/rilke-…") to an absolute URL
// against the current METADATA_BASE_URL. `new URL(path, base)` normalises
// leading slashes and collapses accidental doubles, so callers can pass
// router-style paths verbatim.
export function canonicalUrl(path = '/'): string {
  return new URL(path, siteUrl()).toString();
}
