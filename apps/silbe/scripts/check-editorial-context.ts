/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyAdminFetch } from '../lib/shopify-admin';

// Lists every product in the shop with its silbe.editorial_context state.
// The metafield is the Edition discriminator for the Editorial-Mail flow
// (lib/editorial-context.ts) — a stray non-empty brief on a non-Edition
// product would silently include it in the order-confirmation event. This
// check is the audit surface that catches that drift.
//
// Usage:
//   pnpm tsx scripts/check-editorial-context.ts
//
// Output: one line per product, grouped — products WITH a brief printed first
// (the canonical Editions), then products WITHOUT, then any with a malformed
// metafield (e.g. whitespace-only value).

const QUERY = /* GraphQL */ `
  query AllProductsEditorialContext($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          handle
          title
          metafield(namespace: "silbe", key: "editorial_context") { value }
        }
      }
    }
  }
`;

type Node = {
  handle: string;
  title: string;
  metafield: { value: string } | null;
};
type Response = {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: { node: Node }[];
  };
};

async function fetchAll(): Promise<Node[]> {
  const all: Node[] = [];
  let cursor: string | null = null;
  do {
    const data: Response = await shopifyAdminFetch<Response>(QUERY, { cursor });
    for (const edge of data.products.edges) all.push(edge.node);
    cursor = data.products.pageInfo.hasNextPage
      ? data.products.pageInfo.endCursor
      : null;
  } while (cursor);
  return all;
}

async function main(): Promise<void> {
  const all = await fetchAll();
  const withBrief: Node[] = [];
  const whitespaceOnly: Node[] = [];
  const without: Node[] = [];

  for (const node of all) {
    const raw = node.metafield?.value ?? null;
    if (raw === null) {
      without.push(node);
    } else if (raw.trim() === '') {
      whitespaceOnly.push(node);
    } else {
      withBrief.push(node);
    }
  }

  console.log(
    `Scanned ${all.length} products in ${process.env.SHOPIFY_SHOP ?? '(unknown shop)'}.\n`,
  );
  console.log(`WITH editorial_context (${withBrief.length}) — these become Edition mail items:`);
  for (const n of withBrief) console.log(`  · ${n.handle} — ${n.title}`);
  console.log();

  if (whitespaceOnly.length > 0) {
    console.log(`MALFORMED — whitespace-only value (${whitespaceOnly.length}):`);
    for (const n of whitespaceOnly) console.log(`  · ${n.handle} — ${n.title}`);
    console.log();
  }

  console.log(`WITHOUT editorial_context (${without.length}) — silent skip in mail flow:`);
  for (const n of without) console.log(`  · ${n.handle} — ${n.title}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
