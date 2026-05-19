/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyFetch } from '../lib/shopify';

// One-off diagnostic for the β-strategy: verify the active edition SKUs
// in Shopify have the expected variant shape (single-variant for
// Goldrahmen-style, multi-variant A3+A2 for Hero-style) and that
// Format-dimensions match ISO 216.
//
// 2026-05-19: only the 3 MVP editions are Active in Shopify. Expand
// EDITION_HANDLES when more SKUs flip to active in
// scripts/metafields-manifest.ts.

const EDITION_HANDLES = [
  'silbe-rilke-habegeduld',
  'silbe-kafka-axt',
  'silbe-zweig-dir-der-du',
] as const;

const VARIANT_FRAGMENT = /* GraphQL */ `
  fragment VariantsForHandle on Product {
    handle
    title
    variants(first: 10) {
      nodes {
        id
        title
        selectedOptions { name value }
      }
    }
  }
`;

const QUERY = /* GraphQL */ `
  ${VARIANT_FRAGMENT}
  query VariantsCheck {
    ${EDITION_HANDLES.map(
      (h, i) => `e${i}: product(handle: "${h}") { ...VariantsForHandle }`,
    ).join('\n    ')}
  }
`;

type ProductSnapshot = {
  handle: string;
  title: string;
  variants: { nodes: { id: string; title: string; selectedOptions: { name: string; value: string }[] }[] };
} | null;

type Response = Record<string, ProductSnapshot>;

function printProduct(label: string, p: ProductSnapshot): void {
  if (!p) {
    console.log(`  ${label}: ✗ 404 (not found)`);
    return;
  }
  const variants = p.variants.nodes;
  console.log(`  ${label}: ✓ "${p.title}" — ${variants.length} variant(s)`);
  variants.forEach((v, i) => {
    const opts = v.selectedOptions.map((o) => `${o.name}=${o.value}`).join(', ') || '(no options)';
    console.log(`      [${i + 1}] ${v.title} (${opts})`);
  });
}

// ISO 216 standard dimensions per format. Drift in the live catalog (A3
// not 29.7 × 42, etc.) is a Klasse-3a follow-up signal — STOPP and
// inform user before manifest update under β strategy.
const ISO_216 = {
  A3: '29.7 × 42',
  A2: '42 × 59.4',
  A1: '59.4 × 84.1',
} as const;

function parseFormatString(value: string): { format: string; dims: string } | null {
  const m = value.match(/^([A-Z0-9]+)\s*\(([^)]+?)\s*cm\)$/);
  return m ? { format: m[1], dims: m[2].trim() } : null;
}

async function main(): Promise<void> {
  console.log(`VariantsCheck — alle ${EDITION_HANDLES.length} active edition-SKUs gegen Live-Shopify.\n`);
  const data = await shopifyFetch<Response>(QUERY, undefined, { cache: 'no-store' });

  let missing = 0;
  let multiVariant = 0;
  const dimensionDrift: { handle: string; format: string; expected: string; actual: string }[] = [];

  for (const handle of EDITION_HANDLES) {
    const key = `e${EDITION_HANDLES.indexOf(handle)}`;
    const product = data[key];
    if (!product) {
      console.log(`✗ ${handle} — 404 (not found)`);
      missing++;
      continue;
    }
    const variants = product.variants.nodes;
    const labels = variants.map((v) => {
      const f = v.selectedOptions.find((o) => o.name === 'Format');
      return f?.value ?? v.title;
    });
    console.log(`✓ ${handle} — ${variants.length}× variant — [${labels.join(' | ')}]`);
    if (variants.length > 1) multiVariant++;

    // Verify ISO 216 dimensions for each variant.
    for (const v of variants) {
      const fmt = v.selectedOptions.find((o) => o.name === 'Format');
      if (!fmt) continue;
      const parsed = parseFormatString(fmt.value);
      if (!parsed) continue;
      const expected = ISO_216[parsed.format as keyof typeof ISO_216];
      if (expected && parsed.dims !== expected) {
        dimensionDrift.push({ handle, format: parsed.format, expected, actual: parsed.dims });
      }
    }
  }

  console.log(`\n---\n`);
  console.log(`Found: ${EDITION_HANDLES.length - missing}/${EDITION_HANDLES.length} edition-SKUs`);
  console.log(`Multi-variant SKUs: ${multiVariant}`);
  console.log(`Dimension drift vs ISO 216: ${dimensionDrift.length}`);
  if (dimensionDrift.length > 0) {
    console.log('  Drift detected — STOPP for β-strategy review:');
    for (const d of dimensionDrift) {
      console.log(`    ${d.handle}: format=${d.format} expected="${d.expected}" actual="${d.actual}"`);
    }
    process.exit(2);
  }
  if (missing > 0) {
    console.log(`\nSome handles missing — verify in Shopify Admin.`);
    process.exit(1);
  }
  console.log('\n→ β-strategy clear: Variant.selectedOptions is SoT for format+dimensions on all editions.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
