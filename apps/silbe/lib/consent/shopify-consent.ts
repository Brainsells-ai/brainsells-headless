// Thin wrapper around window.Shopify.customerPrivacy for headless use.
//
// Shopify exposes the global after the consent-tracking-api script (loaded
// via next/script in ConsentProvider) has finished loading. In headless mode
// the headless-storefront config (headlessStorefront + the three domain/token
// fields) must be MERGED INTO the consent object passed as setTrackingConsent's
// FIRST argument — without it the consent decision is dropped because there is
// no storefront cookie domain Shopify can default to. The SECOND argument is
// the success callback (a function), NOT the config: passing the config object
// there throws ConsentValidationError ("the second argument must be a function
// if provided") and the write never lands. Verified against the headless code
// example at https://shopify.dev/docs/api/customer-privacy.
//
// Scope of this module: load the API + read currentVisitorConsent + write
// setTrackingConsent. The document event 'visitorConsentCollected' is the
// integration point for the later Stape / Consent Mode v2 step. We do not
// dispatch or listen for downstream pixels here.

import type { ConsentCategories, VisitorConsent } from './types';

type HeadlessConfig = {
  headlessStorefront: true;
  checkoutRootDomain: string;
  storefrontRootDomain: string;
  storefrontAccessToken: string;
};

// The single object setTrackingConsent expects as its FIRST argument in
// headless mode: the visitor's consent choices merged with the headless config.
export type TrackingConsentPayload = ConsentCategories & HeadlessConfig;

// Narrow subset we actually call. Shopify's API has more surface; we keep the
// shape to what Step 1 needs so future additions are explicit.
export type CustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsent;
  // Headless signature: ONE payload object (consent categories merged with the
  // headless config) as arg 1, an optional success callback as arg 2. The
  // config is NOT a separate second argument — see writeTrackingConsent.
  setTrackingConsent: (
    payload: TrackingConsentPayload,
    callback?: () => void,
  ) => void;
};

declare global {
  interface Window {
    Shopify?: {
      customerPrivacy?: CustomerPrivacy;
    };
  }
}

export const CONSENT_API_SRC =
  'https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js';

export function getCustomerPrivacy(): CustomerPrivacy | null {
  if (typeof window === 'undefined') return null;
  return window.Shopify?.customerPrivacy ?? null;
}

export function buildHeadlessConfig(args: {
  checkoutRootDomain: string;
  storefrontRootDomain: string;
  storefrontAccessToken: string;
}): HeadlessConfig {
  return {
    headlessStorefront: true,
    checkoutRootDomain: args.checkoutRootDomain,
    storefrontRootDomain: args.storefrontRootDomain,
    storefrontAccessToken: args.storefrontAccessToken,
  };
}

// Single chokepoint for the consent WRITE. Merges consent + headless config
// into the first argument and passes the callback as the second — the exact
// shape Shopify's headless Customer Privacy API requires. Keeping this here
// (instead of inline in ConsentProvider) gives the unit test a pure,
// render-free seam to assert the call shape, which guards against re-passing
// the config object as the second argument (the ConsentValidationError bug).
export function writeTrackingConsent(
  api: CustomerPrivacy,
  consent: ConsentCategories,
  config: HeadlessConfig,
  onConsentWritten: () => void,
): void {
  api.setTrackingConsent({ ...consent, ...config }, onConsentWritten);
}
