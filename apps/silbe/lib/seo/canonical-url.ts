import { brandConfig } from '@/lib/brand.config';

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
// ✅ Leck #1 behoben 2026-08-10: the value now comes from brandConfig.site.origin,
// which THROWS on a missing env instead of falling back to 'https://silbe.at'.
// The old fallback was the most dangerous of the four Block-A leaks precisely
// because it was silent — an unset var, a var set to silbe.at, and a var that
// never reached the process all produced identical output, and telling them apart
// took timestamp forensics across three measurement rounds.
//
// Fixed together with Leck #4 (layout.tsx metadataBase) on purpose: they were two
// independent sources for one value. Fixing only one would have produced a
// SPLIT-BRAIN — sitemap on the new domain, every page's canonical still claiming
// silbe.at. Google reading contradictory signals is worse than uniformly wrong ones.
//
// Still evaluated lazily per call rather than at module import: scripts that load
// .env.local AFTER importing this module (e.g. register-webhooks.ts) would
// otherwise read the env var before dotenv populated it — and would now throw
// rather than silently fall back.

function siteUrl(): URL {
  return new URL(brandConfig.site.origin);
}

// Resolve a path ("/", "/editionen", "/editionen/rilke-…") to an absolute URL
// against the current METADATA_BASE_URL. `new URL(path, base)` normalises
// leading slashes and collapses accidental doubles, so callers can pass
// router-style paths verbatim.
export function canonicalUrl(path = '/'): string {
  return new URL(path, siteUrl()).toString();
}
