// Server-side gtag /g/collect builder for the `purchase` event.
//
// Replaces the Shop-Pay-sandbox Web Pixel, whose keepalive fetch never delivered
// across the checkout domain switch (shop.app → silbe.at/thank-you killed the
// in-flight request). The orders/paid webhook calls this from the Vercel
// function — server-to-server, no sandbox — and POSTs the result to the Stape
// server container so the GA4/Meta/TikTok/Pinterest server tags fan out (Weg A).
//
// Wire format is byte-for-byte the verified Stufe-0 hit (and the now-deprecated
// pixel template): v=2, tid, gtm, _p, cid (bare), sid, sct, seg, en=purchase,
// ep.transaction_id, epn.value, ep.currency, pr<N>=id_~nm~pr~qt[~va], _et, _dbg.

export const STAPE_SERVER_BASE = 'https://ctsqyrwh.eus.stape.net';
const GTAG_GTM_FINGERPRINT = '45je'; // from the green Stufe-0 hit (gtm=)

export type Ga4GtagItem = {
  item_id: string;
  item_name: string;
  item_variant?: string | null;
  price?: string | number | null;
  quantity?: number | null;
};

// GA4 items → gtag pr<N> segments: id_<id>~nm<name>~pr<price>~qt<qty>[~va<variant>].
// The structural `~` stay LITERAL — encodeURIComponent leaves `~` untouched, so
// only the dynamic values get encoded. Do NOT use URLSearchParams (it would
// percent-encode `~` to %7E and break gtag's product parsing).
export function gtagProducts(items: Ga4GtagItem[]): string[] {
  return items.map((it, i) => {
    let seg =
      'id_' + encodeURIComponent(it.item_id ?? '') +
      '~nm' + encodeURIComponent(it.item_name ?? '');
    if (it.price != null) seg += '~pr' + it.price;
    if (it.quantity != null) seg += '~qt' + it.quantity;
    // Caveat 1 (verified live, order #1020): item_variant lands in GA4 via ~va.
    // Shopify's single-variant default "Default Title" is GA4 noise → suppress it;
    // real multi-format editions (A4/A3 …) still send their actual variant name.
    if (
      it.item_variant != null &&
      it.item_variant !== '' &&
      it.item_variant !== 'Default Title'
    ) {
      seg += '~va' + encodeURIComponent(it.item_variant);
    }
    return 'pr' + (i + 1) + '=' + seg;
  });
}

// Google consent-state string: 'G1' + ad_storage bit + analytics_storage bit
// (e.g. G111 = both granted, G100 = both denied). Defense-in-depth for the Stape
// CAPI tags, which can be configured to gate on ad_storage. The hard gate stays
// server-side (bs_ud is only attached when marketing consent is granted); this
// only reinforces it tag-side.
export function buildGcs(adGranted: boolean, analyticsGranted: boolean): string {
  return `G1${adGranted ? '1' : '0'}${analyticsGranted ? '1' : '0'}`;
}

export function buildPurchaseGtagUrl(args: {
  measurementId: string;
  clientId: string;
  sessionId: string;
  transactionId: string;
  value: string | number;
  currency: string;
  items: Ga4GtagItem[];
  // event_id for browser↔server CAPI dedup — reused across a Shopify
  // at-least-once re-delivery so Meta/TikTok/Pinterest drop the duplicate even
  // if the server-side idempotency marker is bypassed. Order id (= transaction_id).
  // GA4 ignores it (GA4 dedups purchase by transaction_id); no firewall needed.
  eventId?: string;
  // Google consent state (gcs). Omitted → no consent param (prior behavior).
  gcs?: string;
  // base64url-packed CAPI user_data (bs_ud). Attach ONLY when it exists — it is
  // consented, hashed PII and MUST be stripped from the GA4 tag Stape-side (the
  // single firewalled param). null/undefined → not sent (GA4-only hit, as before).
  userDataPacked?: string | null;
  debug?: boolean;
}): string {
  const q = [
    'v=2',
    'tid=' + args.measurementId,
    'gtm=' + GTAG_GTM_FINGERPRINT,
    '_p=1',
    'cid=' + encodeURIComponent(args.clientId),
    'sid=' + encodeURIComponent(args.sessionId),
    'sct=1',
    'seg=1',
    'en=purchase',
    '_et=100',
    'ep.transaction_id=' + encodeURIComponent(args.transactionId),
    'epn.value=' + args.value, // numeric — epn. (not ep.)
    'ep.currency=' + encodeURIComponent(args.currency),
  ];
  if (args.gcs) q.push('gcs=' + args.gcs);
  if (args.eventId) q.push('ep.event_id=' + encodeURIComponent(args.eventId));
  // CAPI-only, GA4-firewalled param. base64url is already URL-safe; encode
  // defensively for consistency with the other params.
  if (args.userDataPacked) q.push('ep.bs_ud=' + encodeURIComponent(args.userDataPacked));
  for (const pr of gtagProducts(args.items)) q.push(pr);
  if (args.debug) q.push('_dbg=1'); // DebugView ONLY — off in prod or it won't hit Realtime/reports
  return STAPE_SERVER_BASE + '/g/collect?' + q.join('&');
}
