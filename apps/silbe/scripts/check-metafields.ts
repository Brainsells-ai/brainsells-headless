/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify';
import { brandConfig } from '@/lib/brand.config';

// Pflicht-Metafields aus docs/vocabulary.md §5.3 — Namespace aus brand.config.
// Diese Felder werden von der PDP gelesen (Material-Specs, JSON-LD,
// Cross-Links). Fehlt eines, rendert die PDP mit Fallbacks oder leeren
// strukturierten Daten.
const REQUIRED_METAFIELDS = [
  { key: 'author_full_name', type: 'single_line_text' },
  { key: 'author_handle', type: 'single_line_text' },
  { key: 'work_title', type: 'single_line_text' },
  { key: 'work_year', type: 'number_integer' },
  { key: 'quote_full', type: 'multi_line_text' },
  { key: 'format', type: 'single_line_text' },
  { key: 'dimensions_cm', type: 'single_line_text' },
  { key: 'paper_gsm', type: 'number_integer' },
  { key: 'print_location', type: 'single_line_text' },
  { key: 'editorial_essay_handle', type: 'single_line_text' },
  { key: 'themes', type: 'json' },
] as const;

const HANDLES_QUERY = /* GraphQL */ `
  query AllProductHandles {
    products(first: 50) {
      nodes {
        handle
        title
      }
    }
  }
`;

const PRODUCT_METAFIELDS_QUERY = /* GraphQL */ `
  query ProductMetafields($handle: String!, $ids: [HasMetafieldsIdentifier!]!) {
    product(handle: $handle) {
      id
      handle
      title
      metafields(identifiers: $ids) {
        namespace
        key
        value
        type
      }
    }
  }
`;

type ProductNode = { handle: string; title: string };
type MetafieldNode = { namespace: string; key: string; value: string; type: string } | null;

async function main(): Promise<void> {
  const handlesData = await shopifyFetch<{ products: { nodes: ProductNode[] } }>(
    HANDLES_QUERY,
    undefined,
    { cache: 'no-store' },
  );
  const products = handlesData.products.nodes;

  if (products.length === 0) {
    console.log('No products returned from Shopify Storefront API.');
    console.log('Possible causes: empty catalog, wrong store domain, or token missing read_products scope.');
    process.exit(1);
  }

  console.log(
    `Found ${products.length} products. Checking ${REQUIRED_METAFIELDS.length} required metafields per product (namespace: silbe).\n`,
  );

  const ns = brandConfig.editorial.namespace;
  const identifiers = REQUIRED_METAFIELDS.map((m) => ({ namespace: ns, key: m.key }));
  const failures: { handle: string; missing: string[] }[] = [];

  for (const product of products) {
    const data = await shopifyFetch<{
      product: {
        handle: string;
        title: string;
        metafields: MetafieldNode[];
      } | null;
    }>(
      PRODUCT_METAFIELDS_QUERY,
      { handle: product.handle, ids: identifiers },
      { cache: 'no-store' },
    );

    if (!data.product) {
      console.log(`✗ ${product.handle} — product not found via handle lookup`);
      failures.push({ handle: product.handle, missing: ['<product missing>'] });
      continue;
    }

    const present = new Set(
      data.product.metafields
        .filter((m): m is NonNullable<MetafieldNode> => m !== null)
        .map((m) => `${m.namespace}.${m.key}`),
    );
    const missing = REQUIRED_METAFIELDS.filter(
      (m) => !present.has(`silbe.${m.key}`),
    ).map((m) => m.key);

    if (missing.length === 0) {
      console.log(`✓ ${product.handle}`);
    } else {
      console.log(`✗ ${product.handle} — missing: ${missing.join(', ')}`);
      failures.push({ handle: product.handle, missing });
    }
  }

  console.log('\n---\n');
  if (failures.length === 0) {
    console.log('All required metafields present on all products. ✓');
    process.exit(0);
  }

  console.log(`${failures.length}/${products.length} products have missing metafields.\n`);
  console.log('Fix path: Shopify Admin → Products → [product] → Metafields, namespace `silbe`.');
  console.log('If ALL products show ALL fields missing: the metafield definitions likely need');
  console.log('"Storefronts can read" enabled in Shopify Admin → Settings → Custom data → Products.\n');
  console.log('See docs/vocabulary.md §5.3 for the required values per field.');
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
