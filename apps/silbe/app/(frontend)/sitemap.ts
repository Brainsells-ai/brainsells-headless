import type { MetadataRoute } from 'next';
import { getAllProductHandles } from '@/lib/shopify-queries';
import { canonicalUrl } from '@/lib/seo/canonical-url';

// Dynamic sitemap. Edition URLs come from the manifest (getAllProductHandles →
// CANONICAL_HANDLES), the SAME source generateStaticParams uses with
// dynamicParams=false — so the sitemap is guaranteed drift-free against the
// PDPs that actually render. No live Storefront query: keeps the sitemap from
// going empty if Shopify is briefly unreachable at request time.

// Public, indexable static routes. /widerruf (the Widerruf-Button entry page)
// is public; its token-gated /bestaetigen + /erfolg steps are robots-disallowed
// and intentionally absent here.
const STATIC_ROUTES: { path: string; priority: number }[] = [
  { path: '/', priority: 1.0 },
  { path: '/editionen', priority: 0.8 },
  { path: '/ueber-uns', priority: 0.6 },
  { path: '/widerruf', priority: 0.3 },
  { path: '/impressum', priority: 0.3 },
  { path: '/agb', priority: 0.3 },
  { path: '/datenschutz', priority: 0.3 },
  { path: '/versand', priority: 0.3 },
  { path: '/widerrufsrecht', priority: 0.3 },
  { path: '/widerrufsformular', priority: 0.3 },
  { path: '/cookie-einstellungen', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();
  const handles = await getAllProductHandles();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: canonicalUrl(route.path),
    lastModified,
    priority: route.priority,
  }));

  const editionEntries: MetadataRoute.Sitemap = handles.map((handle) => ({
    url: canonicalUrl(`/editionen/${handle}`),
    lastModified,
    priority: 0.7,
  }));

  return [...staticEntries, ...editionEntries];
}
