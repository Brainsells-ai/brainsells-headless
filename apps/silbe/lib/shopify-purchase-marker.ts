// Idempotency marker for the orders/paid GA4 purchase webhook.
//
// orders/paid can be delivered more than once (Shopify at-least-once). A
// duplicate purchase event inflates GA4 revenue (the metric downstream decisions
// run on), so after a successful send we record a per-order marker — a Shopify
// Order metafield `silbe.ga4_purchase_sent` — and skip if it is already set.
//
// Self-contained: an ad-hoc metafield needs no definition and no database, so
// the blueprint ports to a new shop without extra infra (DB-free by design).
//
// Caveat (documented, accepted): read-check-then-write is NOT atomic. Two TRULY
// concurrent deliveries (both inside the read+send+write window, on separate
// function instances) could still both send. That window is ~hundreds of ms and
// Shopify's duplicates are overwhelmingly DELAYED re-deliveries (which this
// catches), not simultaneous — so a Postgres unique constraint (fully atomic but
// pulls in a DB dependency) is deliberately NOT used here.
//
// Requires `read_orders` + `write_orders` (already held for the Widerruf flow).

import { shopifyAdminFetch } from '@/lib/shopify-admin';

const MARKER_NAMESPACE = 'silbe';
const MARKER_KEY = 'ga4_purchase_sent';

const READ_QUERY = /* GraphQL */ `
  query Ga4PurchaseMarker($id: ID!) {
    order(id: $id) {
      metafield(namespace: "${MARKER_NAMESPACE}", key: "${MARKER_KEY}") { value }
    }
  }
`;

const SET_MUTATION = /* GraphQL */ `
  mutation SetGa4PurchaseMarker($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors { field message }
    }
  }
`;

type ReadResp = { order: { metafield: { value: string | null } | null } | null };
type SetResp = {
  metafieldsSet: { userErrors: { field: string[] | null; message: string }[] };
};

export async function ga4PurchaseAlreadySent(orderGid: string): Promise<boolean> {
  const data = await shopifyAdminFetch<ReadResp>(READ_QUERY, { id: orderGid });
  return data.order?.metafield?.value === 'true';
}

export async function markGa4PurchaseSent(orderGid: string): Promise<void> {
  const data = await shopifyAdminFetch<SetResp>(SET_MUTATION, {
    metafields: [
      {
        ownerId: orderGid,
        namespace: MARKER_NAMESPACE,
        key: MARKER_KEY,
        type: 'boolean',
        value: 'true',
      },
    ],
  });
  const errs = data.metafieldsSet.userErrors;
  if (errs.length > 0) {
    throw new Error(
      `metafieldsSet failed: ${errs
        .map((e) => `${e.field?.join('.') ?? 'ERR'}: ${e.message}`)
        .join(', ')}`,
    );
  }
}
