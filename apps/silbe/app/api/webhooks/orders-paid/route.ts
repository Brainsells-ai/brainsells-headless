// Shopify orders/paid webhook → server-side GA4 `purchase` via Stape (gtag).
//
// Replaces the Web Pixel purchase, whose keepalive fetch never delivered across
// the Shop-Pay checkout domain switch (see web-pixel-purchase-delivery-failure).
// This is the same proven server-side pattern as the refund webhook: HMAC-verify
// → read the order from the (signed) payload → build the gtag /g/collect hit →
// POST to the Stape server container, which fans out to the GA4/Meta/TikTok/
// Pinterest server tags (Weg A). No browser, no sandbox, no unload race.
//
// SEPARATE from orders/create: that topic feeds the dormant Klaviyo editorial
// path (order-created/route.ts) and is intentionally NOT auto-registered. This
// handler only ever runs for orders/paid.
//
// Always returns 200 once the HMAC is verified — even on data/send errors — to
// avoid the Shopify retry storm. Node runtime (HMAC uses node:crypto).

import { NextResponse, type NextRequest } from 'next/server';
import { verifyShopifyWebhookHmac } from '@/lib/shopify-webhook-hmac';
import { buildPurchaseGtagUrl, type Ga4GtagItem } from '@/lib/tracking/ga4-gtag-purchase';
import { GA_CLIENT_ID_ATTR, GA_SESSION_ID_ATTR } from '@/lib/tracking/ga-cart-attributes';

export const runtime = 'nodejs';

const GA4_MEASUREMENT_ID = 'G-Z06HHP6EFM';

// The orders/paid REST payload carries everything we need (HMAC-signed by
// Shopify, so trusted — no Admin lookup). id is already the NUMERIC order id, so
// transaction_id is byte-identical to the refund webhook's numericOrderId → GA4
// joins purchase↔refund automatically.
type OrdersPaidLineItem = {
  product_id: number | string | null;
  title: string;
  variant_title: string | null;
  price: string | null;
  quantity: number;
};
type NoteAttribute = { name: string; value: string | null };
type OrdersPaidWebhook = {
  id: number | string;
  total_price: string | null;
  currency: string | null;
  line_items: OrdersPaidLineItem[];
  note_attributes: NoteAttribute[];
};

// Fallback client_id when the GA id was not captured on the order (e.g. orders
// placed before capture shipped, or no analytics consent at checkout). GA's
// format is "<digits>.<unix-seconds>". Counted (value) but unattributed.
function syntheticClientId(): string {
  return `${Math.floor(Math.random() * 1e10)}.${Math.floor(Date.now() / 1000)}`;
}

function noteAttr(notes: NoteAttribute[] | undefined, name: string): string | null {
  return notes?.find((n) => n.name === name)?.value ?? null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Raw body BEFORE parse — HMAC verifies the exact signed bytes.
  const rawBody = await req.text();
  const sigHeader = req.headers.get('x-shopify-hmac-sha256');

  const secret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!secret) {
    console.error('[orders-paid] SHOPIFY_CLIENT_SECRET is not set — refusing all requests');
  }
  if (!verifyShopifyWebhookHmac(rawBody, sigHeader, secret)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

  let order: OrdersPaidWebhook;
  try {
    order = JSON.parse(rawBody) as OrdersPaidWebhook;
  } catch (err) {
    console.error('[orders-paid] payload parse failed:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderId = String(order.id ?? '');
  if (!orderId) {
    console.error('[orders-paid] no order id — skipping');
    return NextResponse.json({ ok: true });
  }

  const value = order.total_price ?? undefined;
  const currency = order.currency ?? undefined;
  if (value == null || currency == null) {
    console.error(`[orders-paid] order ${orderId} missing total_price/currency — skipping`);
    return NextResponse.json({ ok: true });
  }

  const storedClientId = noteAttr(order.note_attributes, GA_CLIENT_ID_ATTR);
  const clientId = storedClientId ?? syntheticClientId();
  const sessionId =
    noteAttr(order.note_attributes, GA_SESSION_ID_ATTR) ?? String(Math.floor(Date.now() / 1000));
  if (!storedClientId) {
    console.log(
      `[orders-paid] order ${orderId}: no stored GA client_id — using synthetic id (counted, unattributed)`,
    );
  }

  const items: Ga4GtagItem[] = (order.line_items ?? []).map((li) => ({
    item_id: String(li.product_id ?? ''),
    item_name: li.title,
    item_variant: li.variant_title,
    price: li.price,
    quantity: li.quantity,
  }));

  // DebugView toggle for E2E verification (esp. Caveat 1 item_variant). Env-gated
  // so it can be flipped in Vercel without a code change. Default OFF for prod.
  const debug = process.env.GA4_PURCHASE_DEBUG === '1';

  const url = buildPurchaseGtagUrl({
    measurementId: GA4_MEASUREMENT_ID,
    clientId,
    sessionId,
    transactionId: orderId,
    value,
    currency,
    items,
    debug,
  });

  // Idempotency: like the refund webhook, this handler always returns 200, so
  // Shopify never retries (no storm), and orders/paid normally fires once.
  // Shopify's at-least-once delivery can still rarely double-deliver → a
  // duplicate purchase event (same transaction_id), which inflates GA4 revenue
  // more than a duplicate refund would. Durable dedup keyed on the order id
  // (order metafield marker or a Postgres unique constraint) is the recommended
  // follow-up — flagged as a review decision; not implemented here (matches the
  // refund PR #50 baseline to keep the diff focused).

  try {
    const r = await fetch(url, { method: 'POST', keepalive: true, cache: 'no-store' });
    if (!r.ok) {
      console.error(`[orders-paid] gtag returned non-2xx: ${r.status} for ${orderId}`);
    } else {
      console.log(
        `[orders-paid] purchase sent for ${orderId} (${value} ${currency}, ${items.length} items)` +
          (debug ? ` [debug] ${url}` : ''),
      );
    }
  } catch (err) {
    console.error(`[orders-paid] gtag send failed for ${orderId}:`, err);
  }

  return NextResponse.json({ ok: true });
}
