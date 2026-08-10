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
    //
    // Normalized: trailing slash(es) are stripped so the caller's
    // `base + '/g/collect'` can never produce a double slash. This is the ONE
    // brand.config value concatenated into a URL PATH — measurementId /
    // gtmFingerprint / namespace / editorialEvent are query params or opaque
    // strings, where a trailing slash is harmless, so they stay verbatim.
    // Block-A hardening: a trailing slash in the env value built
    // `…net//g/collect` → 404 on the gtag hit (a Block-A regression class the
    // Block-B verification run surfaced; the old hardcoded constant was clean).
    get serverBase(): string {
      return requireEnv('STAPE_SERVER_BASE').replace(/\/+$/, '');
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

    // Attribution string on newsletter signups (Klaviyo `custom_source`).
    // Was hardcoded to 'silbe.at footer' in klaviyo.ts — a fork inherited SILBE's
    // attribution and could not tell its own signups apart in Klaviyo.
    get newsletterSource(): string {
      return requireEnv('KLAVIYO_NEWSLETTER_SOURCE');
    },
  },

  // Shopify metafield namespace for the EDITORIAL content contract
  // (author_handle, work_title, quote_full, editorial_context, …).
  //
  // Distinct from `marker.namespace` above, which is the purchase-idempotency
  // marker. Both happened to be the literal 'silbe', which is exactly why the
  // ambiguity was worth removing: they are two independent contracts that can be
  // set to different values by a fork.
  //
  // Was consumed at MODULE SCOPE in shopify-queries.ts and editorial-context.ts;
  // both were restructured to build their identifier list / query lazily, so
  // importing them no longer reads the env.
  //
  // ⚠️ THIS IS STILL A BUILD-TIME REQUIREMENT, and the lazy restructuring does not
  // change that. The PDP sets `dynamicParams = false` + `generateStaticParams()`,
  // so `getProductByHandle` — and through it `metafieldIds()` — runs during
  // `next build`. A missing EDITORIAL_METAFIELD_NAMESPACE therefore takes the BUILD
  // red, not just a request. Set it in the deployment env BEFORE merging.
  //
  // That is the intended trade: a fork that has not declared its own metafield
  // namespace must not build a storefront that silently reads SILBE's.
  editorial: {
    get namespace(): string {
      return requireEnv('EDITORIAL_METAFIELD_NAMESPACE');
    },
  },

  // Fulfillment provider selection for the Layer-1 fulfillment interface.
  //
  // NOTE: MEGAPROMPT §7.3 specifies a separate `config/brand.ts` holding a second
  // `brandConfig`. That spec predates PR #64, which introduced THIS file. Building
  // both would put two brandConfig objects in one codebase — the exact two-sources
  // pattern the Schicht-0 fork documented as Leck #4. Decision 2026-08-06: the
  // fulfillment block lives here, `config/brand.ts` is dropped.
  //
  // NOT wired into any SILBE route. SILBE's prints run through the Gelato Shopify
  // app and its tote bags through Printful on app level — neither passes here.
  //
  // ---- Factory level vs. per-brand: the split, made explicit ----
  // PRINTFUL_API_TOKEN is FACTORY level. One account-wide token serves every
  // brand; it is not a per-brand secret, and it is read by the provider, not from
  // here — a per-brand config has no business holding a shared credential.
  //
  // The store id below is PER BRAND. Verified 2026-08-06: the Printful account
  // carries more than one store, and store-scoped endpoints require an explicit
  // `X-PF-Store-Id`. "Take the only store" or "take the first" would resolve to
  // the wrong one TODAY, and would silently send brand N+1's orders to brand 1's
  // store. Discovered via API, written down explicitly — never inferred at runtime.
  fulfillment: {
    // Provider used for a line item that carries no explicit override.
    get defaultProvider(): string {
      return requireEnv('FULFILLMENT_DEFAULT_PROVIDER');
    },

    // Allowlist. A provider outside this list is refused by the router even if a
    // product metafield names it — a mis-typed metafield must not route an order
    // to a provider this brand never enabled.
    get enabledProviders(): string[] {
      return requireEnv('FULFILLMENT_ENABLED_PROVIDERS')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    },

    printful: {
      // Per-brand Printful store id (numeric, e.g. the shopify-type store).
      get storeId(): string {
        return requireEnv('PRINTFUL_STORE_ID');
      },
    },
  },
} as const;
