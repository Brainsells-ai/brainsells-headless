// Canonical Shopify Storefront read layer. PDP, Stimmen-Page, Cross-Links,
// and Homepage Featured-Editions all read through this module — never the
// raw shopifyFetch helper directly.
//
// Voice + canonical-handle gating: getProductByHandle enforces both
// CANONICAL_HANDLES whitelist (legacy SKU filter) and voice canonicality
// (archived voice / drift → 404). Other read paths apply the same gates.

import {
  type CanonicalVoice,
  isCanonicalVoice,
  assertCanonicalVoice,
} from '@/lib/constants/voices';
import { CANONICAL_HANDLES, EDITIONS } from '@/scripts/metafields-manifest';
import { shopifyFetch, SHOPIFY_TAGS } from './shopify';
import { brandConfig } from './brand.config';

// ─── Shopify Response Types ────────────────────────────────────────────────

type Money = { amount: string; currencyCode: string };

type ShopifyImage = {
  url: string;
  altText: string | null;
  width: number;
  height: number;
};

type ShopifyVariant = {
  id: string;
  title: string;
  sku: string | null;
  availableForSale: boolean;
  price: Money;
  selectedOptions: { name: string; value: string }[];
};

type ShopifyMetafieldRaw = {
  namespace: string;
  key: string;
  value: string;
  type: string;
} | null;

type ShopifyProductDetailRaw = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  productType: string;
  tags: string[];
  vendor: string;
  featuredImage: ShopifyImage | null;
  images: { nodes: ShopifyImage[] };
  variants: { nodes: ShopifyVariant[] };
  priceRange: {
    minVariantPrice: Money;
    maxVariantPrice: Money;
  };
  metafields: ShopifyMetafieldRaw[];
};

type ShopifyProductOptionRaw = {
  name: string;
  values: string[];
};

type ShopifyProductSummaryRaw = {
  id: string;
  handle: string;
  title: string;
  priceRange: { minVariantPrice: Money };
  featuredImage: ShopifyImage | null;
  options: ShopifyProductOptionRaw[];
};

// ─── Public Types ──────────────────────────────────────────────────────────

export type ParsedProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  availableForSale: boolean;
  // Inferred from silbe.author_handle metafield (primary) or `author:{voice}`
  // Shopify tag (bridge). null only when neither is canonical — caller
  // typically returns 404 in that case.
  voice: CanonicalVoice | null;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
  priceRange: { min: Money; max: Money };
  metafields: {
    author_full_name: string | null;
    author_handle: string | null;
    work_title: string | null;
    work_year: number | null;
    quote_full: string | null;
    format: string | null;
    dimensions_cm: string | null;
    paper_gsm: number | null;
    print_location: string | null;
    editorial_essay_handle: string | null;
    themes: string[];
  };
};

export type SummaryProduct = {
  id: string;
  handle: string;
  title: string;
  priceRange: { min: Money };
  featuredImage: ShopifyImage | null;
  // Values of the Shopify "Format" option (e.g. ['A3', 'A2'] for hero
  // multi-variant, ['A3'] for single-variant Goldrahmen, [] when no Format
  // option exists). Drives the variant-hint label on listing cards. Strings
  // are surfaced verbatim from Shopify — variant labels include dimensions
  // (e.g. "A3 (29.7 × 42 cm)"); callers may strip the parenthetical for
  // compact display.
  formatOptions: string[];
};

// ─── Metafield Identifier Set ──────────────────────────────────────────────

const METAFIELD_KEYS = [
  'author_full_name',
  'author_handle',
  'work_title',
  'work_year',
  'quote_full',
  'format',
  'dimensions_cm',
  'paper_gsm',
  'print_location',
  'editorial_essay_handle',
  'themes',
] as const;

// Built per call, NOT as a module-level constant, so merely IMPORTING this module
// no longer reads the env — vitest and any importer stay unaffected.
//
// ⚠️ It is nevertheless a BUILD-TIME requirement, and it would be wrong to read
// the lazy construction as making it runtime-only: the PDP sets
// `dynamicParams = false` with `generateStaticParams()`, so getProductByHandle
// runs during `next build` and calls straight into here. A missing
// EDITORIAL_METAFIELD_NAMESPACE takes the build red. Intended — a fork must not
// prerender pages that silently read SILBE's metafield namespace.
function metafieldIds(): Array<{ namespace: string; key: string }> {
  const namespace = brandConfig.editorial.namespace;
  return METAFIELD_KEYS.map((key) => ({ namespace, key }));
}

// Manifest-driven voice lookup — primary SoT for voice resolution at runtime.
// Manifest is the canonical editorial source-of-truth (β-strategy confirmed
// 2026-05-11). Shopify metafield silbe.author_handle and product tag
// `author:*` are cross-checked via inferVoice for DRIFT DETECTION ONLY —
// they never override the manifest value.
const VOICE_BY_HANDLE = new Map<string, CanonicalVoice | null>(
  EDITIONS.map((e) => [e.handle, e.voice]),
);

// ─── GraphQL Fragments + Queries ───────────────────────────────────────────

const PRODUCT_DETAIL_FRAGMENT = /* GraphQL */ `
  fragment ProductDetail on Product {
    id
    handle
    title
    description
    descriptionHtml
    availableForSale
    productType
    tags
    vendor
    featuredImage { url altText width height }
    images(first: 8) { nodes { url altText width height } }
    variants(first: 10) {
      nodes {
        id
        title
        sku
        availableForSale
        price { amount currencyCode }
        selectedOptions { name value }
      }
    }
    priceRange {
      minVariantPrice { amount currencyCode }
      maxVariantPrice { amount currencyCode }
    }
    metafields(identifiers: $ids) {
      namespace
      key
      value
      type
    }
  }
`;

const PRODUCT_SUMMARY_FRAGMENT = /* GraphQL */ `
  fragment ProductSummary on Product {
    id
    handle
    title
    priceRange { minVariantPrice { amount currencyCode } }
    featuredImage { url altText width height }
    options { name values }
  }
`;

const PDP_QUERY = /* GraphQL */ `
  ${PRODUCT_DETAIL_FRAGMENT}
  query ProductPDP($handle: String!, $ids: [HasMetafieldsIdentifier!]!) {
    product(handle: $handle) { ...ProductDetail }
  }
`;

const PRODUCTS_BY_VOICE_QUERY = /* GraphQL */ `
  ${PRODUCT_DETAIL_FRAGMENT}
  query ProductsByVoice($q: String!, $ids: [HasMetafieldsIdentifier!]!) {
    products(first: 25, query: $q) {
      nodes { ...ProductDetail }
    }
  }
`;

const ALL_EDITIONS_SUMMARY_QUERY = /* GraphQL */ `
  ${PRODUCT_SUMMARY_FRAGMENT}
  query AllEditionsSummary {
    products(first: 50, sortKey: TITLE) { nodes { ...ProductSummary } }
  }
`;

const HOMEPAGE_FEATURED_QUERY = /* GraphQL */ `
  ${PRODUCT_SUMMARY_FRAGMENT}
  query HomepageFeatured($q: String!) {
    products(first: 10, query: $q) {
      nodes { ...ProductSummary }
    }
  }
`;

// ─── Parsing Helpers (internal) ────────────────────────────────────────────

function parseMetafields(raw: ShopifyMetafieldRaw[]): ParsedProduct['metafields'] {
  const lookup = new Map<string, string>();
  for (const m of raw) {
    if (m) lookup.set(m.key, m.value);
  }
  const get = (key: string): string | null => lookup.get(key) ?? null;
  const getNumber = (key: string): number | null => {
    const v = lookup.get(key);
    if (v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const getThemes = (): string[] => {
    const v = lookup.get('themes');
    if (!v) return [];
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed)
        ? parsed.filter((s): s is string => typeof s === 'string')
        : [];
    } catch {
      return [];
    }
  };
  return {
    author_full_name: get('author_full_name'),
    author_handle: get('author_handle'),
    work_title: get('work_title'),
    work_year: getNumber('work_year'),
    quote_full: get('quote_full'),
    format: get('format'),
    dimensions_cm: get('dimensions_cm'),
    paper_gsm: getNumber('paper_gsm'),
    print_location: get('print_location'),
    editorial_essay_handle: get('editorial_essay_handle'),
    themes: getThemes(),
  };
}

function inferVoice(
  authorHandle: string | null,
  tags: string[],
): CanonicalVoice | null {
  // Primary: silbe.author_handle metafield (canonical post-seed).
  if (authorHandle && isCanonicalVoice(authorHandle)) {
    return authorHandle;
  }
  // Bridge: Shopify product tag `author:rilke` etc. — pre-seed period
  // where metafield values aren't populated yet but tags may exist.
  for (const tag of tags) {
    const match = tag.match(/^author:(.+)$/);
    if (match && isCanonicalVoice(match[1])) {
      return match[1];
    }
  }
  return null;
}

function parseProduct(raw: ShopifyProductDetailRaw): ParsedProduct {
  const metafields = parseMetafields(raw.metafields);
  const manifestVoice = VOICE_BY_HANDLE.get(raw.handle) ?? null;
  // Drift detection: compare manifest against Shopify metafield/tag. Warn
  // on divergence but always trust the manifest.
  const shopifyVoice = inferVoice(metafields.author_handle, raw.tags);
  if (shopifyVoice && manifestVoice && shopifyVoice !== manifestVoice) {
    console.warn(
      `[shopify-queries] voice drift on ${raw.handle}: manifest=${manifestVoice} shopify=${shopifyVoice}. Using manifest.`,
    );
  }
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description,
    descriptionHtml: raw.descriptionHtml,
    availableForSale: raw.availableForSale,
    voice: manifestVoice,
    images: raw.images.nodes,
    variants: raw.variants.nodes,
    priceRange: {
      min: raw.priceRange.minVariantPrice,
      max: raw.priceRange.maxVariantPrice,
    },
    metafields,
  };
}

function toSummary(raw: ShopifyProductSummaryRaw): SummaryProduct {
  const formatOption = raw.options.find(
    (o) => o.name.toLowerCase() === 'format',
  );
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    priceRange: { min: raw.priceRange.minVariantPrice },
    featuredImage: raw.featuredImage,
    formatOptions: formatOption?.values ?? [],
  };
}

// ─── Public Functions ──────────────────────────────────────────────────────

// Fetch a single product for the PDP. Returns null when:
//   - handle is not in CANONICAL_HANDLES whitelist (legacy SKU filter)
//   - Shopify returns no product for the handle
//   - manifest voice for the handle is null (defensive — should not happen
//     for canonical edition handles since EDITIONS.filter(product_type ===
//     'edition') guarantees a canonical voice per entry)
// Null return triggers notFound() at the route layer.
export async function getProductByHandle(handle: string): Promise<ParsedProduct | null> {
  if (!CANONICAL_HANDLES.includes(handle)) return null;

  const data = await shopifyFetch<{ product: ShopifyProductDetailRaw | null }>(
    PDP_QUERY,
    { handle, ids: metafieldIds() },
    { tags: [SHOPIFY_TAGS.product(handle), SHOPIFY_TAGS.products] },
  );

  if (!data.product) return null;

  const parsed = parseProduct(data.product);
  if (parsed.voice === null) {
    console.warn(
      `[shopify-queries] product ${handle} has no manifest voice — should not happen for canonical edition handles. Returning null → 404.`,
    );
    return null;
  }
  return parsed;
}

// Returns the manifest's whitelist of canonical edition handles. No
// Shopify call — decouples `generateStaticParams` from catalog state.
export async function getAllProductHandles(): Promise<string[]> {
  return [...CANONICAL_HANDLES];
}

// Fetch all canonical edition products for a given voice. Throws via
// assertCanonicalVoice if called with archived/unknown voice.
export async function getProductsByVoice(voice: CanonicalVoice): Promise<ParsedProduct[]> {
  assertCanonicalVoice(voice);
  const data = await shopifyFetch<{ products: { nodes: ShopifyProductDetailRaw[] } }>(
    PRODUCTS_BY_VOICE_QUERY,
    { q: `tag:author:${voice}`, ids: metafieldIds() },
    { tags: [SHOPIFY_TAGS.products] },
  );
  return data.products.nodes
    .filter((p) => CANONICAL_HANDLES.includes(p.handle))
    .map(parseProduct)
    .filter((p): p is ParsedProduct & { voice: CanonicalVoice } => p.voice === voice);
}

// Fetch related products for PDP CrossLinks: same voice, excluding
// current handle, limited to `limit` items. Returns empty array when no
// peers exist — caller (CrossLinks component) is responsible for not
// rendering the section in that case. No cross-voice BEST_SELLING fallback
// by editorial discipline: SILBE cross-discovery happens via Stimmen-
// Navigation, not via PDP cross-sell. Voices with single editions (Kafka,
// Ebner-Eschenbach) will naturally have empty CrossLinks until Phase 5–6
// adds peers.
export async function getRelatedProductsByVoice(
  excludeHandle: string,
  voice: CanonicalVoice,
  limit = 2,
): Promise<ParsedProduct[]> {
  assertCanonicalVoice(voice);
  const peers = await getProductsByVoice(voice);
  return peers.filter((p) => p.handle !== excludeHandle).slice(0, limit);
}

// Listing route /editionen — all canonical edition SKUs, ordered by the
// EDITIONS manifest position (editorial order). Fetches 50 via TITLE sort
// (Shopify-side determinism), then filters to CANONICAL_HANDLES (defense
// against catalog drift / non-edition product_types) and re-sorts by
// manifest index. Returns SummaryProduct[] — caller renders the grid.
export async function getAllEditionsSummary(): Promise<SummaryProduct[]> {
  const data = await shopifyFetch<{
    products: { nodes: ShopifyProductSummaryRaw[] };
  }>(ALL_EDITIONS_SUMMARY_QUERY, undefined, {
    tags: [SHOPIFY_TAGS.products],
  });

  const summaries = data.products.nodes
    .filter((p) => CANONICAL_HANDLES.includes(p.handle))
    .map(toSummary);

  const orderIndex = new Map<string, number>(
    CANONICAL_HANDLES.map((h, i) => [h, i]),
  );
  return summaries.sort(
    (a, b) =>
      (orderIndex.get(a.handle) ?? Number.MAX_SAFE_INTEGER) -
      (orderIndex.get(b.handle) ?? Number.MAX_SAFE_INTEGER),
  );
}

// R8 Homepage Featured-Editions: fetch a fixed, ordered set of handles
// (Rilke → Kafka → Zweig per lib/featured-homepage.ts). Deterministic —
// never relies on Shopify collection state or BEST_SELLING. Returns the
// summaries in the SAME order as `handles` (Shopify response order is not
// guaranteed). Missing handles are silently dropped — the section can render
// 1–3 cards; if all three are missing, returns [] and caller renders the
// "Editionen — in Vorbereitung" fallback.
export async function getHomepageFeaturedEditions(
  handles: readonly string[],
): Promise<SummaryProduct[]> {
  if (handles.length === 0) return [];
  const q = handles.map((h) => `handle:${h}`).join(' OR ');
  try {
    const data = await shopifyFetch<{ products: { nodes: ShopifyProductSummaryRaw[] } }>(
      HOMEPAGE_FEATURED_QUERY,
      { q },
      { tags: [SHOPIFY_TAGS.products, ...handles.map(SHOPIFY_TAGS.product)] },
    );
    const byHandle = new Map<string, ShopifyProductSummaryRaw>(
      data.products.nodes.map((n) => [n.handle, n]),
    );
    return handles
      .map((h) => byHandle.get(h))
      .filter((n): n is ShopifyProductSummaryRaw => Boolean(n))
      .map(toSummary);
  } catch (err) {
    console.error('[shopify-queries] homepage featured fetch failed:', err);
    return [];
  }
}

