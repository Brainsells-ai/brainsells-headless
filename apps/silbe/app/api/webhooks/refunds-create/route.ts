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
import { sendGa4MeasurementProtocol } from '@/lib/tracking/ga4-mp';

export const runtime = 'nodejs';

// We depend only on order_id from the refund payload; the rest comes from the
// authoritative Admin-API lookup. id is present for diagnostics.
type ShopifyRefundWebhook = {
  id: number | string;
  order_id: number | string;
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

  // FULL refunds only. A partial refund leaves the order PARTIALLY_REFUNDED;
  // only a full refund flips it to REFUNDED.
  if (ctx.displayFinancialStatus !== 'REFUNDED') {
    console.log(
      `[refunds-create] ${ctx.name} is ${ctx.displayFinancialStatus} — not a full refund, skipping`,
    );
    return NextResponse.json({ ok: true });
  }

  const clientId = ctx.gaClientId ?? syntheticClientId();
  if (!ctx.gaClientId) {
    console.log(
      `[refunds-create] ${ctx.name}: no stored GA client_id — using synthetic id (counted, unattributed)`,
    );
  }

  const params: Record<string, string | number> = {
    transaction_id: orderId,
    value: Number(ctx.totalRefunded.amount),
    currency: ctx.totalRefunded.currencyCode,
    // session_id + engagement_time_msec mirror the purchase event so GA4 keeps
    // the refund in session scope. (A refund days later is past the original
    // session — it will land in DebugView, not Realtime; expected.)
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
