// Per-brand configuration layer — the single source for the shop-specific values
// that were previously hardcoded across the tracking/webhook code (Blueprint
// Block A, ref b370004 Area 1 + Prio #4). One shop = one env set → the code
// itself is brand-agnostic and ports to shop N+1 by swapping env, never source.
//
// LAZY BY DESIGN. Every value is read through a getter, NOT at module load, so
// importing this module never touches the environment. That matches the existing
// idiom (ga4-mp.ts / shopify-webhook-hmac.ts read env inside functions) and is
// load-bearing: `next build` and vitest import the route/lib modules — an eager
// `requireEnv()` at import would throw during build/test where these vars aren't
// set. Fail-fast still holds: the throw fires on first ACCESS (request time for a
// webhook), which is exactly when a misconfigured N+1 shop must scream instead of
// silently sending to the wrong destination.
//
// No defaults for required values — a missing env is a hard, visible error, never
// a silent fallback to SILBE's values on a new shop.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`[brand.config] required env var ${name} is not set`);
  return value;
}

export const brandConfig = {
  ga4: {
    // GA4 Web data-stream measurement id (G-…). Single source: both the server
    // `purchase` (orders/paid → Stape gtag) and the server `refund` (refunds/
    // create → MP) read it here — previously orders-paid hardcoded it while
    // ga4-mp read env, so a property switch could split them (wrong-property bug).
    get measurementId(): string {
      return requireEnv('GA4_MEASUREMENT_ID');
    },
    // Measurement Protocol API secret for the `refund` MP send (server-only).
    get apiSecret(): string {
      return requireEnv('GA4_API_SECRET');
    },
  },
  stape: {
    // EU-hosted Stape server-container base (…stape.net). The gtag /g/collect
    // purchase POSTs here; the free tier serves EU egress only (US → 502).
    get serverBase(): string {
      return requireEnv('STAPE_SERVER_BASE');
    },
    // gtag `gtm=` fingerprint from the verified green Stufe-0 hit — pins the wire
    // format Stape's server tags expect.
    get gtmFingerprint(): string {
      return requireEnv('GTAG_GTM_FINGERPRINT');
    },
  },
  marker: {
    // Shopify Order metafield namespace for the GA4 purchase idempotency marker
    // (`<namespace>.ga4_purchase_sent`). NOTE: this is ONLY the purchase-marker
    // namespace — the editorial-content metafields (editorial-context.ts,
    // shopify-queries.ts, seed scripts) use the literal 'silbe' namespace by a
    // separate contract and are intentionally out of scope for Block A.
    get namespace(): string {
      return requireEnv('MARKER_NAMESPACE');
    },
  },
  klaviyo: {
    // Klaviyo custom-event name fired by the dormant orders/create editorial path
    // (order-created/route.ts). Must match the Klaviyo Flow trigger name exactly.
    get editorialEvent(): string {
      return requireEnv('KLAVIYO_EDITORIAL_EVENT');
    },
  },
} as const;
