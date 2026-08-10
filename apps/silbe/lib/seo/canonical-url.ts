// Single source of truth for absolute SILBE URLs across SEO surfaces
// (JSON-LD schemas, sitemap, canonical/OG metadata).
//
// METADATA_BASE_URL holds THIS brand's origin and is set per deployment. It is
// intentionally NOT NEXT_PUBLIC_* — every consumer (schema builders, sitemap,
// metadata) runs server-side.
//
// 🔧 DOKU-LECK, behoben 2026-08-10: this comment used to read "set in Vercel
// (https://silbe.at in production)" and the .env.example did not list the key at
// all. A fork therefore inherited SILBE's origin straight out of the
// documentation — even with the code fixed — or never learned the key existed.
// Name no brand's value here.
//
// ⚠️ The `?? 'https://silbe.at'` fallback below is STILL a silent leak (Leck #1)
// and is deliberately NOT fixed in this PR. Making it fail-fast turns
// METADATA_BASE_URL into a hard BUILD-time requirement, because sitemap.ts and
// robots.ts are evaluated during `next build` — a missing var would then take the
// production build red rather than emit a wrong URL. That switch needs the var
// confirmed present in Vercel first. Tracked together with Leck #4
// (layout.tsx metadataBase literal), which has the same build-time character.
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
