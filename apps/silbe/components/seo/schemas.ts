// Typed JSON-LD schema builders. Each returns a plain object (a schema.org
// node) — rendering happens via <JsonLd>. No side effects, no fetching: the
// Product builder consumes an already-fetched ParsedProduct (Decision 3 — we
// reuse getProductByHandle rather than a second Storefront roundtrip).
//
// Scope (Phase 9 Sprint A, minimal-viable):
//   Organization · WebSite · Product (AggregateOffer) · BreadcrumbList.
// Deferred to polish-backlog: WebSite.potentialAction.SearchAction (no /suche
// route yet → would point Google's sitelinks searchbox at a 404), Product
// author/AggregateRating/FAQPage.

import type { ParsedProduct } from '@/lib/shopify-queries';
import { canonicalUrl } from '@/lib/seo/canonical-url';

type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = canonicalUrl('/#organization');
const WEBSITE_ID = canonicalUrl('/#website');

export function organizationSchema(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: 'SILBE',
    legalName: 'Brainsells e.U.',
    url: canonicalUrl('/'),
    logo: canonicalUrl('/brand/social-avatar-1000.png'),
    email: 'hallo@silbe.at',
    vatID: 'ATU83140245',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rueppgasse 32/12',
      postalCode: '1020',
      addressLocality: 'Wien',
      addressCountry: 'AT',
    },
  };
}

export function websiteSchema(): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'SILBE',
    url: canonicalUrl('/'),
    inLanguage: 'de-AT',
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function productSchema(product: ParsedProduct, path: string): JsonLdNode {
  const url = canonicalUrl(path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((image) => image.url),
    url,
    brand: { '@type': 'Brand', name: 'SILBE' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: product.priceRange.min.currencyCode,
      lowPrice: product.priceRange.min.amount,
      highPrice: product.priceRange.max.amount,
      offerCount: product.variants.length,
      availability: product.availableForSale
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
  };
}

// Builds a BreadcrumbList from ordered { name, path } pairs. Paths are
// resolved to absolute URLs via canonicalUrl. Homepage gets no breadcrumb
// (a single "Home" item is noise Google ignores — Flag B).
export function breadcrumbSchema(
  items: { name: string; path: string }[],
): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}
