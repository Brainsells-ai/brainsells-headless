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
import { verifyShopifyWebhook } from '@/lib/shopify-webhook-hmac';
import { buildPurchaseGtagUrl, type Ga4GtagItem } from '@/lib/tracking/ga4-gtag-purchase';
import {
  GA_CLIENT_ID_ATTR,
  GA_SESSION_ID_ATTR,
  MARKETING_CONSENT_ATTR,
} from '@/lib/tracking/ga-cart-attributes';
import { resolveConsentedUserData } from '@/lib/tracking/user-data';
import { ga4PurchaseAlreadySent, markGa4PurchaseSent } from '@/lib/shopify-purchase-marker';

export const runtime = 'nodejs';
// Co-locate with the EU-hosted Stape container (ctsqyrwh.eus.stape.net): the
// gtag /g/collect send returned 502 from the default US region (iad1) while the
// same hit succeeds from the EU and Vercel→Google MP works — i.e. Stape's
// free-tier proxy doesn't serve the US egress. EU egress also fits the EU store
// (data residency). (Per-route region needs a Pro plan; on Hobby set the
// project's function region to Frankfurt — this stays a correct hint.)
export const preferredRegion = 'fra1';

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
// client_details is the customer's browser context recorded by Shopify at
// checkout — NOT the webhook request source (never Vercel's egress IP). Verified
// on real orders #1020/#1025: browser_ip = customer IPv6, user_agent = customer
// UA, both present (app has protected-customer-data access). These feed the CAPI
// user_data (ip/ua PLAINTEXT per platform requirement).
type ClientDetails = { browser_ip?: string | null; user_agent?: string | null };
type OrdersPaidWebhook = {
  id: number | string;
  total_price: string | null;
  currency: string | null;
  line_items: OrdersPaidLineItem[];
  note_attributes: NoteAttribute[];
  email?: string | null;
  client_details?: ClientDetails | null;
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

  if (!verifyShopifyWebhook(rawBody, sigHeader)) {
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

  const orderGid = `gid://shopify/Order/${orderId}`;

  // Idempotency: skip if a purchase was already sent for this order. orders/paid
  // can be delivered more than once (Shopify at-least-once) and a duplicate
  // purchase inflates GA4 revenue. See lib/shopify-purchase-marker for the
  // metafield mechanism + the documented concurrent-delivery caveat.
  try {
    if (await ga4PurchaseAlreadySent(orderGid)) {
      console.log(`[orders-paid] ${orderId}: purchase already sent — skipping (idempotent)`);
      return NextResponse.json({ ok: true });
    }
  } catch (err) {
    // Read failed → proceed rather than risk LOSING the purchase. A re-delivery
    // could then duplicate, but a missed purchase is worse than a rare dup.
    console.error(`[orders-paid] marker read failed for ${orderId} — proceeding:`, err);
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

  // CAPI user_data (Stufe 2) — HARD server-side consent gate. Attach the hashed
  // email + plaintext IP/UA bundle ONLY when the order carries explicit marketing
  // (ad_user_data) consent, captured at begin_checkout (PR A). denied / unknown /
  // absent → no bundle: the purchase still sends (value + transaction_id) but no
  // PII reaches Meta/TikTok/Pinterest. Stape strips bs_ud from the GA4 tag so GA4
  // never sees it either.
  const marketingConsent = noteAttr(order.note_attributes, MARKETING_CONSENT_ATTR);
  const userDataPacked = resolveConsentedUserData({
    marketingConsent,
    email: order.email,
    ip: order.client_details?.browser_ip, // IPv6-safe: passed verbatim
    userAgent: order.client_details?.user_agent,
  });

  // Per-platform test_event_code (Stufe 2, PR C) — env-gated so a platform can be
  // routed to its Test-Events tab from Vercel without a code change. Set ONE at a
  // time (Meta → then TikTok → then Pinterest); leaving one set in prod routes
  // real conversions to the Test tab (undercount), so warn loudly when active.
  const testEventCodes = {
    meta: process.env.META_TEST_EVENT_CODE,
    tiktok: process.env.TIKTOK_TEST_EVENT_CODE,
    pinterest: process.env.PINTEREST_TEST_EVENT_CODE,
  };
  const activeTestPlatforms = Object.entries(testEventCodes)
    .filter(([, v]) => v)
    .map(([k]) => k);
  if (activeTestPlatforms.length > 0) {
    console.warn(
      `[orders-paid] TEST-EVENT MODE active for: ${activeTestPlatforms.join(', ')} — ` +
        `these events route to the platform Test-Events tab, not prod. Unset in prod.`,
    );
  }

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
    // event_id = order id → CAPI dedup against Shopify at-least-once re-delivery.
    eventId: orderId,
    userDataPacked,
    testEventCodes,
    debug,
  });

  // keepalive is a browser-unload concept — irrelevant (and pointlessly odd) for
  // a server-side undici fetch, so it is omitted here.
  let sentOk = false;
  try {
    const r = await fetch(url, { method: 'POST', cache: 'no-store' });
    if (!r.ok) {
      console.error(`[orders-paid] gtag returned non-2xx: ${r.status} for ${orderId}`);
    } else {
      sentOk = true;
      // NEVER log the raw URL as-is: bs_ud carries the (plaintext) customer IP/UA.
      // Redact the bs_ud value from the debug URL; the non-PII ud flag records
      // whether a consented bundle was attached.
      const safeUrl = url.replace(/(ep\.bs_ud=)[^&]*/, '$1<redacted>');
      console.log(
        `[orders-paid] purchase sent for ${orderId} (${value} ${currency}, ${items.length} items, ` +
          `ud=${userDataPacked ? 'attached' : 'none'})` +
          (debug ? ` [debug] ${safeUrl}` : ''),
      );
    }
  } catch (err) {
    console.error(`[orders-paid] gtag send failed for ${orderId}:`, err);
  }

  if (!sentOk) {
    // HMAC passed and the order is valid — only the Stape send failed (e.g. a
    // transient 502). Return 500 so Shopify RETRIES the delivery; the marker is
    // set only on success, so the eventual retry re-sends, and once it succeeds
    // the marker keeps any further re-delivery idempotent.
    return NextResponse.json({ error: 'gtag send failed' }, { status: 500 });
  }

  try {
    await markGa4PurchaseSent(orderGid);
  } catch (err) {
    console.error(`[orders-paid] marker write failed for ${orderId} — a re-delivery may duplicate:`, err);
  }

  return NextResponse.json({ ok: true });
}
