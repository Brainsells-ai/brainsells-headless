// Shopify refunds/create webhook → GA4 `refund` event via Measurement Protocol.
//
// Pipeline:
//   raw body → HMAC-verify (SHOPIFY_CLIENT_SECRET, timing-safe) → JSON.parse
//   → Admin-API order lookup (displayFinancialStatus + GA customAttributes)
//   → FULL-refund gate: displayFinancialStatus === 'REFUNDED' (partials ignored)
//   → MP `refund` event: transaction_id = numeric order id (byte-identical to
//     the purchase Web-Pixel's String(checkout.order.id)), value/currency from
//     the order's cumulative refund, client_id/session_id from the order's
//     customAttributes (captured at begin_checkout), or a synthetic client_id
//     fallback so the event is still counted (value only, unattributed).
//
// Always returns 200 once the HMAC is verified — even on data/MP errors — to
// avoid the Shopify retry storm. A transient MP failure is not worth retrying
// the whole order lookup; it is logged for a human instead.

import { NextResponse, type NextRequest } from 'next/server';
import { verifyShopifyWebhookHmac } from '@/lib/shopify-webhook-hmac';
import { getRefundOrderContext } from '@/lib/shopify-refund-order';
import { classifyRefund } from '@/lib/refund-classify';
import { sendGa4MeasurementProtocol } from '@/lib/tracking/ga4-mp';

export const runtime = 'nodejs';

// From the refund payload we read order_id (to look up the order) and
// transactions (the refunded money — settlement-independent, unlike the order's
// displayFinancialStatus). id is present for diagnostics.
type ShopifyRefundWebhook = {
  id: number | string;
  order_id: number | string;
  transactions?: { amount?: string | null; kind?: string | null }[];
};

// The purchase pixel sends String(checkout.order.id) = the NUMERIC order id.
// The Admin API returns a GID (gid://shopify/Order/<num>). Normalising to the
// trailing numeric run makes transaction_id byte-identical to the pixel for
// EITHER input shape, so GA4 joins refund↔purchase. (Verified 2026-06: pixel
// emits numeric; this stays robust if Shopify ever flips it to GID.)
function numericOrderId(idOrGid: string): string {
  const match = String(idOrGid).match(/(\d+)\s*$/);
  return match ? match[1] : '';
}

// Fallback client_id when none was persisted on the order (e.g. orders placed
// before capture shipped, or no analytics consent at checkout). GA's client_id
// format is "<digits>.<unix-seconds>". The refund is then counted (value +
// currency) but not tied to the original GA user/session — "Weg B".
function syntheticClientId(): string {
  return `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Raw body BEFORE parse — HMAC verifies the exact signed bytes.
  const rawBody = await req.text();
  const sigHeader = req.headers.get('x-shopify-hmac-sha256');

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    console.error('[refunds-create] SHOPIFY_CLIENT_SECRET is not set — refusing all requests');
  }
  if (!verifyShopifyWebhookHmac(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

  let refund: ShopifyRefundWebhook;
  try {
    refund = JSON.parse(rawBody) as ShopifyRefundWebhook;
  } catch (err) {
    console.error('[refunds-create] payload parse failed:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = numericOrderId(String(refund.order_id ?? ''));
  if (!orderId) {
    console.error(`[refunds-create] refund ${String(refund.id)} has no usable order_id — skipping`);
    return NextResponse.json({ ok: true });
  }
  const orderGid = `gid://shopify/Order/${orderId}`;

  let ctx;
  try {
    ctx = await getRefundOrderContext(orderGid);
  } catch (err) {
    // Admin lookup failure is a genuine transient error, but retrying the whole
    // webhook risks a storm; log and 200. A missed refund event is recoverable.
    console.error(`[refunds-create] order lookup failed for ${orderGid}:`, err);
    return NextResponse.json({ ok: true });
  }
  if (!ctx) {
    console.error(`[refunds-create] order ${orderGid} not found — skipping`);
    return NextResponse.json({ ok: true });
  }

  // FULL refunds only — detected from the refund's own amount (webhook payload)
  // vs the order total, NOT from displayFinancialStatus. Shopify Payments
  // refunds settle async: at refunds/create time the refund is REFUND/PENDING,
  // the order is still PAID, and totalRefunded is 0.0. The status flips to
  // REFUNDED only at settlement, and refunds/create does not re-fire then — so
  // gating on '=== REFUNDED' silently drops every Shopify-Payments refund.
  const { isFull, amount: refundAmount } = classifyRefund({
    transactions: refund.transactions,
    priorRefunded: Number(ctx.totalRefunded.amount) || 0,
    orderTotal: Number(ctx.orderTotal.amount) || 0,
  });
  if (!isFull) {
    console.log(
      `[refunds-create] ${ctx.name}: not a full refund ` +
        `(this ${refundAmount} + prior ${ctx.totalRefunded.amount} of ` +
        `${ctx.orderTotal.amount} ${ctx.orderTotal.currencyCode}, status ` +
        `${ctx.displayFinancialStatus}) — skipping`,
    );
    return NextResponse.json({ ok: true });
  }

  // Idempotency: this handler always returns 200, so Shopify never retries (no
  // storm). Shopify's at-least-once delivery can still, rarely, deliver the same
  // refunds/create twice → a duplicate GA4 refund event (same transaction_id).
  // GA4 MP has no dedup; durable dedup keyed on the refund id (Postgres) is the
  // follow-up if duplicates ever surface. Left out here to keep the hotfix tight.

  const clientId = ctx.gaClientId ?? syntheticClientId();
  if (!ctx.gaClientId) {
    console.log(
      `[refunds-create] ${ctx.name}: no stored GA client_id — using synthetic id (counted, unattributed)`,
    );
  }

  const params: Record<string, string | number> = {
    transaction_id: orderId,
    // value/currency come from THIS refund (classifyRefund), NOT ctx.totalRefunded
    // which reads 0.0 while a Shopify-Payments refund is still pending.
    value: refundAmount,
    currency: ctx.orderTotal.currencyCode,
    // session_id + engagement_time_msec mirror the purchase event so GA4 keeps
    // the refund in session scope. The prod MP send sets no debug_mode, so the
    // refund lands in standard reports — not DebugView, and not Realtime once
    // past the original session window. Expected.
    engagement_time_msec: 1,
  };
  if (ctx.gaSessionId) params.session_id = ctx.gaSessionId;

  try {
    const result = await sendGa4MeasurementProtocol({
      clientId,
      events: [{ name: 'refund', params }],
    });
    if (!result.ok) {
      console.error(`[refunds-create] MP returned non-2xx: ${result.status} for ${ctx.name}`);
    } else {
      console.log(
        `[refunds-create] refund sent for ${ctx.name} (txn ${orderId}, ${params.value} ${params.currency})`,
      );
    }
  } catch (err) {
    console.error(`[refunds-create] MP send failed for ${ctx.name}:`, err);
  }

  return NextResponse.json({ ok: true });
}
