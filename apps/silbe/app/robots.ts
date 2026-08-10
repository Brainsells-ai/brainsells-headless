import type { MetadataRoute } from 'next';
import { brandConfig } from '@/lib/brand.config';
import { canonicalUrl } from '@/lib/seo/canonical-url';

// Allow-all crawl with the sitemap pointer. Disallowed paths: the token-gated
// Widerruf confirmation steps (no public content, must not be indexed) and the
// API surface.
//
// ⚠️ MUSS IM APP-ROOT LIEGEN. Diese Datei lag von ihrer Einführung (#37,
// 2026-05-27) bis 2026-08-10 unter `app/(frontend)/robots.ts` — und Next hat sie
// dort SCHWEIGEND ignoriert: `/robots.txt` lieferte 404, die Route tauchte in
// keinem Build-Manifest auf, und der Build blieb grün. `sitemap.ts` funktioniert
// in derselben Route-Gruppe problemlos; die Asymmetrie ist empirisch belegt
// (Build-Vergleich vorher/nachher), nicht abgeleitet. Nicht zurück in eine
// Route-Gruppe verschieben.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/widerruf/bestaetigen', '/widerruf/erfolg', '/api/'],
    },
    sitemap: canonicalUrl('/sitemap.xml'),
    // Nackter Hostname, keine URL. Vorher stand hier `canonicalUrl('/')`, was
    // `Host: https://…/` erzeugte — die Direktive erwartet aber `Host: example.com`.
    // Mit Schema und Trailing Slash ist sie im besten Fall wirkungslos.
    host: new URL(brandConfig.site.origin).host,
  };
}
