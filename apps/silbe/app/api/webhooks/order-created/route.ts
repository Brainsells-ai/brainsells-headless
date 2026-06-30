// Shopify orders/create webhook → Klaviyo "Bestellung Editorial" custom event.
//
// Pipeline:
//   raw body → HMAC-verify (SHOPIFY_CLIENT_SECRET, timing-safe) → JSON.parse
//   → build Items[] via lib/editorial-context (live Admin-API fetch of
//     silbe.editorial_context, productType==='edition' filter, fail-loud on
//     missing brief / handle)
//   → sign 14-day widerruf token (lib/widerruf-token, gid://Order/…)
//   → trackKlaviyoEvent('Bestellung Editorial', …) with event.Items + token
//
// Always returns 200 once the HMAC is verified — even on data errors —
// to avoid the Shopify retry storm. Missing-brief / missing-handle bugs need
// a human fix (re-seed) and would not benefit from automated retries.
// Empty-event case (postcards-only order / no editions) → no event fired,
// 200 OK, log only.

import { NextResponse, type NextRequest } from 'next/server';
import {
  buildEditorialMailItems,
  type EditorialLineItem,
} from '@/lib/editorial-context';
import { signWiderrufToken } from '@/lib/widerruf-token';
import { trackKlaviyoEvent } from '@/lib/klaviyo-events';
import { verifyShopifyWebhook } from '@/lib/shopify-webhook-hmac';

export const runtime = 'nodejs';

// 14 days — the §356a BGB Widerruf window. The magic-link in the mail must
// stay valid for as long as the customer can legally cancel.
const TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;

// Tightly-typed expected shape from Shopify's orders/create REST webhook. We
// don't take Shopify's word for any field we depend on: anything missing →
// defensive null + diagnostic, never a crash. (Cluster-3 R5: real payload
// shape not verified locally — gets exercised in B4 by Aleks's test order.)
type ShopifyOrderWebhookLineItem = {
  product_id: number | string | null;
  sku: string | null;
  title: string;
};
type ShopifyOrderWebhook = {
  id: number | string;
  name: string;
  email: string | null;
  customer: { email: string | null } | null;
  line_items: ShopifyOrderWebhookLineItem[];
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Raw body MUST be read BEFORE JSON.parse — HMAC verifies the exact bytes
  // Shopify signed, not a re-stringified copy.
  const rawBody = await req.text();
  const sigHeader = req.headers.get('x-shopify-hmac-sha256');

  if (!verifyShopifyWebhook(rawBody, sigHeader)) {
    return NextResponse.json({ error: 'Invalid HMAC' }, { status: 401 });
  }

  let order: ShopifyOrderWebhook;
  try {
    order = JSON.parse(rawBody) as ShopifyOrderWebhook;
  } catch (err) {
    console.error('[order-created] payload parse failed:', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const orderGid = `gid://shopify/Order/${String(order.id)}`;
  const email = (order.email ?? order.customer?.email ?? '').trim().toLowerCase();
  if (!email) {
    console.error(
      `[order-created] no email on order ${order.name} (${orderGid}) — no event fired`,
    );
    return NextResponse.json({ ok: true });
  }

  const lineItems: EditorialLineItem[] = (order.line_items ?? []).map((li) => ({
    productId: String(li.product_id ?? ''),
    sku: li.sku,
    title: li.title,
  }));

  let items;
  try {
    items = await buildEditorialMailItems(lineItems);
  } catch (err) {
    // Missing-brief / missing-handle is a data bug (seed not run / stale) —
    // not a Shopify retry candidate. Return 200, log, no event. The mail
    // stays unsent until a human re-seeds.
    console.error(
      `[order-created] context build failed for order ${order.name}:`,
      err,
    );
    return NextResponse.json({ ok: true });
  }

  if (items.length === 0) {
    console.log(
      `[order-created] no editorial items on order ${order.name} — skipping event`,
    );
    return NextResponse.json({ ok: true });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const widerrufToken = signWiderrufToken({
    orderId: orderGid,
    email,
    expiresAt,
  });

  await trackKlaviyoEvent('Bestellung Editorial', email, {
    widerruf_token: widerrufToken,
    order_number: order.name,
    order_id: orderGid,
    Items: items,
  });

  return NextResponse.json({ ok: true });
}
