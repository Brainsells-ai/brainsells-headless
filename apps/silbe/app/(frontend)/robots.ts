import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo/canonical-url';

// Allow-all crawl with the sitemap pointer. Disallowed paths: the token-gated
// Widerruf confirmation steps (no public content, must not be indexed) and the
// API surface.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/widerruf/bestaetigen', '/widerruf/erfolg', '/api/'],
    },
    sitemap: canonicalUrl('/sitemap.xml'),
    host: canonicalUrl('/'),
  };
}
