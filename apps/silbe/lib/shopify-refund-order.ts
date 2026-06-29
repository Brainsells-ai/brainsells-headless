// Admin-API order context for the refunds/create webhook.
//
// The refunds/create payload carries only the Refund object (order_id +
// transactions); it does NOT include the order's financial status or its
// customAttributes. We need both: displayFinancialStatus to gate on FULL
// refunds only (REFUNDED vs PARTIALLY_REFUNDED), and customAttributes to read
// back the GA client_id/session_id persisted at begin_checkout.
//
// Requires the `read_orders` scope (already held for the Widerruf flow) and the
// Node runtime (the caller pins runtime='nodejs').

import { shopifyAdminFetch } from '@/lib/shopify-admin';
import { GA_CLIENT_ID_ATTR, GA_SESSION_ID_ATTR } from '@/lib/tracking/ga-cart-attributes';

export type RefundOrderContext = {
  /** Shopify Order GID. */
  id: string;
  /** Human order name, e.g. "#1001". */
  name: string;
  /** REFUNDED (full) | PARTIALLY_REFUNDED | PAID | … — for logging only; NOT a
   *  full-refund signal (Shopify Payments refunds stay PAID until settlement). */
  displayFinancialStatus: string;
  /** Cumulative amount already SETTLED-refunded. 0.0 while a Shopify-Payments
   *  refund is still pending — do NOT use as the GA4 refund value. */
  totalRefunded: { amount: string; currencyCode: string };
  /** Order total (currentTotalPrice) — the settlement-independent yardstick for
   *  full-refund detection at webhook time. */
  orderTotal: { amount: string; currencyCode: string };
  /** GA4 client_id captured at begin_checkout, or null if none was stored. */
  gaClientId: string | null;
  /** GA4 session_id captured at begin_checkout, or null. */
  gaSessionId: string | null;
};

type OrderCustomAttribute = { key: string; value: string | null };

type OrderRefundContextNode = {
  id: string;
  name: string;
  displayFinancialStatus: string | null;
  totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  customAttributes: OrderCustomAttribute[];
};

type OrderRefundContextResponse = { order: OrderRefundContextNode | null };

const QUERY = /* GraphQL */ `
  query OrderRefundContext($id: ID!) {
    order(id: $id) {
      id
      name
      displayFinancialStatus
      totalRefundedSet { shopMoney { amount currencyCode } }
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      customAttributes { key value }
    }
  }
`;

export async function getRefundOrderContext(
  orderGid: string,
): Promise<RefundOrderContext | null> {
  const data = await shopifyAdminFetch<OrderRefundContextResponse>(QUERY, { id: orderGid });
  const order = data.order;
  if (!order) return null;

  const attr = (key: string): string | null =>
    order.customAttributes.find((a) => a.key === key)?.value ?? null;

  return {
    id: order.id,
    name: order.name,
    displayFinancialStatus: order.displayFinancialStatus ?? 'UNKNOWN',
    totalRefunded: order.totalRefundedSet.shopMoney,
    orderTotal: order.currentTotalPriceSet.shopMoney,
    gaClientId: attr(GA_CLIENT_ID_ATTR),
    gaSessionId: attr(GA_SESSION_ID_ATTR),
  };
}
