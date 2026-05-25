// Admin-API order lookup for the § 356a BGB Widerruf flow.
//
// Order-by-number+email is an Admin-only read (the Storefront API has no such
// query), so this goes through shopify-admin, not the Storefront read layer in
// shopify-queries.ts.
//
// Requires the app to hold the `read_orders` scope (and `read_all_orders` if
// orders older than 60 days must be reachable — relevant near the 14-day
// Widerruf window edge). The matching mutate path needs `write_orders`.
//
// Privacy: we query by order name only, then verify the email in code. The
// caller surfaces a single generic "not found or email mismatch" message so
// the endpoint never reveals whether a given order number exists.
//
// Requires Node runtime (callers pin runtime='nodejs').

import { shopifyAdminFetch } from '@/lib/shopify-admin';

export type WiderrufOrderLineItem = {
  title: string;
  quantity: number;
  amount: string;
  currencyCode: string;
};

export type WiderrufOrder = {
  /** Shopify Order GID, e.g. "gid://shopify/Order/1234567890". */
  id: string;
  /** Human order name incl. prefix, e.g. "#1001". */
  name: string;
  /** Order email, lowercased. */
  email: string;
  /** ISO-8601 order creation timestamp. */
  createdAt: string;
  tags: string[];
  lineItems: WiderrufOrderLineItem[];
  totalAmount: string;
  currencyCode: string;
};

type OrderNode = {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  tags: string[];
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  lineItems: {
    edges: {
      node: {
        title: string;
        quantity: number;
        originalTotalSet: { shopMoney: { amount: string; currencyCode: string } };
      };
    }[];
  };
};

type OrderLookupResponse = { orders: { edges: { node: OrderNode }[] } };
type OrderByIdResponse = { order: OrderNode | null };

const ORDER_NODE_FIELDS = /* GraphQL */ `
  id
  name
  email
  createdAt
  tags
  currentTotalPriceSet { shopMoney { amount currencyCode } }
  lineItems(first: 50) {
    edges {
      node {
        title
        quantity
        originalTotalSet { shopMoney { amount currencyCode } }
      }
    }
  }
`;

function mapOrderNode(node: OrderNode): WiderrufOrder {
  return {
    id: node.id,
    name: node.name,
    email: (node.email ?? '').trim().toLowerCase(),
    createdAt: node.createdAt,
    tags: node.tags ?? [],
    lineItems: node.lineItems.edges.map((li) => ({
      title: li.node.title,
      quantity: li.node.quantity,
      amount: li.node.originalTotalSet.shopMoney.amount,
      currencyCode: li.node.originalTotalSet.shopMoney.currencyCode,
    })),
    totalAmount: node.currentTotalPriceSet.shopMoney.amount,
    currencyCode: node.currentTotalPriceSet.shopMoney.currencyCode,
  };
}

const ORDER_LOOKUP_QUERY = /* GraphQL */ `
  query WiderrufOrderLookup($query: String!) {
    orders(first: 5, query: $query) {
      edges { node { ${ORDER_NODE_FIELDS} } }
    }
  }
`;

const ORDER_BY_ID_QUERY = /* GraphQL */ `
  query WiderrufOrderById($id: ID!) {
    order(id: $id) { ${ORDER_NODE_FIELDS} }
  }
`;

/**
 * Looks an order up by its number and email. Returns the order only if both
 * match; null otherwise (not found, or email mismatch). Never throws on a
 * miss — only on a genuine Admin API failure (fail-loud), which the caller
 * treats as a transient error.
 */
export async function lookupOrderByNumberAndEmail(
  orderNumber: string,
  email: string,
): Promise<WiderrufOrder | null> {
  const digits = orderNumber.replace(/\D/g, '');
  if (!digits) return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const data = await shopifyAdminFetch<OrderLookupResponse>(ORDER_LOOKUP_QUERY, {
    query: `name:#${digits}`,
  });

  for (const edge of data.orders.edges) {
    if ((edge.node.email ?? '').trim().toLowerCase() !== normalizedEmail) continue;
    return mapOrderNode(edge.node);
  }

  return null;
}

/**
 * Fetches an order by its GID — used on the confirm step, where the email was
 * already proven by the signed token, to render fresh order details.
 * Returns null if the order no longer exists. Throws only on Admin API failure.
 */
export async function getWiderrufOrderById(orderId: string): Promise<WiderrufOrder | null> {
  const data = await shopifyAdminFetch<OrderByIdResponse>(ORDER_BY_ID_QUERY, { id: orderId });
  return data.order ? mapOrderNode(data.order) : null;
}
