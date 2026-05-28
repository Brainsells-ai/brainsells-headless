// Builds the `Items` array for the Klaviyo "Bestellung Editorial" custom event.
//
// Why this lib exists (Decision 2026-05-28, ADR 925e0271 + Sprint-B spec v2):
// Editorial briefs are editorial content that lives in Shopify metafields
// (silbe.editorial_context, Single SoT) — they must stay editable without
// deploy. So the webhook handler resolves brief texts LIVE per request via
// the Admin API; we never bake brief texts into the build.
//
// One Admin GraphQL roundtrip per webhook fetches every distinct product in
// the order. Quantity>1 / multi-variant-of-same-product collapse to one Items
// entry per product. Edition vs non-edition is discriminated by
// `productType === 'edition'` (datengetrieben, brand-agnostisch — same logic
// works for future SILBE-style brands).
//
// fail-loud matrix:
//   - editorial_context missing on an Edition  → throw (seed not run / stale)
//   - handle missing on an Edition             → throw (can't build pdp_url)
//   - featuredImage missing on an Edition      → console.warn, image_url=''
//   - all line-items non-edition (postcards…) → returns [], caller fires no event
//
// Requires Node runtime — pulls Admin token via shopify-admin.ts.

import { shopifyAdminFetch } from '@/lib/shopify-admin';
import { canonicalUrl } from '@/lib/seo/canonical-url';

// One entry per Shopify order line-item, as parsed from the webhook payload.
// productId is the raw numeric string from `line_items[].product_id`; sku +
// title are carried along purely for diagnostics in error messages.
export type EditorialLineItem = {
  productId: string;
  sku: string | null;
  title: string;
};

// Shape rendered into the Klaviyo template via {% for item in event.Items %}.
// Casing is deliberate per the Sprint-B spec v2 nachtrag (2026-05-28):
// ProductName PascalCase, the rest snake_case.
export type EditorialMailItem = {
  ProductName: string;
  editorial_context: string;
  image_url: string;
  pdp_url: string;
};

type ProductNode = {
  id: string;
  handle: string | null;
  title: string;
  productType: string;
  featuredImage: { url: string } | null;
  metafield: { value: string } | null;
};

type NodesResponse = {
  nodes: (ProductNode | null)[];
};

const EDITORIAL_MAIL_CONTEXT_QUERY = /* GraphQL */ `
  query EditorialMailContext($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        productType
        featuredImage { url }
        metafield(namespace: "silbe", key: "editorial_context") { value }
      }
    }
  }
`;

function toProductGid(rawProductId: string): string {
  return rawProductId.startsWith('gid://')
    ? rawProductId
    : `gid://shopify/Product/${rawProductId}`;
}

export async function buildEditorialMailItems(
  lineItems: EditorialLineItem[],
): Promise<EditorialMailItem[]> {
  // Dedupe by productId — Quantity>1 + multi-variant-of-same-product orders
  // shouldn't fan out into duplicate Items entries.
  const uniqueIds = [...new Set(lineItems.map((li) => li.productId))];
  if (uniqueIds.length === 0) return [];

  const gids = uniqueIds.map(toProductGid);
  const data = await shopifyAdminFetch<NodesResponse>(
    EDITORIAL_MAIL_CONTEXT_QUERY,
    { ids: gids },
  );

  const byGid = new Map<string, ProductNode>();
  for (const node of data.nodes) {
    if (node?.id) byGid.set(node.id, node);
  }

  const items: EditorialMailItem[] = [];
  for (const rawId of uniqueIds) {
    const gid = toProductGid(rawId);
    const node = byGid.get(gid);
    // Carry the first matching line-item along for diagnostics — sku + title
    // make error messages actionable without forcing the caller to correlate.
    const context = lineItems.find((li) => li.productId === rawId);

    if (!node) {
      // Product GID resolved to no node — ID malformed, or the product was
      // hard-deleted between order placement and webhook delivery. Log + skip.
      console.warn(
        `[editorial-context] product ${gid} not found in Shopify (sku=${context?.sku ?? '?'}, title=${context?.title ?? '?'})`,
      );
      continue;
    }

    // Non-editions (Bundle, Goldrahmen, postcards) carry no brief by design.
    if (node.productType !== 'edition') continue;

    const briefValue = node.metafield?.value?.trim();
    if (!briefValue) {
      throw new Error(
        `Editorial context missing for Edition "${node.title}" (sku=${context?.sku ?? '?'}, handle=${node.handle ?? '?'}). Run scripts/seed-editorial-briefs.ts.`,
      );
    }

    if (!node.handle) {
      throw new Error(
        `Product handle missing for Edition "${node.title}" (sku=${context?.sku ?? '?'}) — cannot build pdp_url.`,
      );
    }

    const imageUrl = node.featuredImage?.url ?? '';
    if (!imageUrl) {
      console.warn(
        `[editorial-context] featuredImage missing for Edition "${node.title}" (sku=${context?.sku ?? '?'}) — mail will render without image`,
      );
    }

    items.push({
      ProductName: node.title,
      editorial_context: briefValue,
      image_url: imageUrl,
      pdp_url: canonicalUrl(`/editionen/${node.handle}`),
    });
  }

  return items;
}
