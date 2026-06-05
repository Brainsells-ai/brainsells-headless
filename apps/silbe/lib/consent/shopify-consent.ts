// Thin wrapper around window.Shopify.customerPrivacy for headless use.
//
// Shopify exposes the global after the consent-tracking-api script (loaded
// via next/script in ConsentProvider) has finished loading. In headless mode
// setTrackingConsent must receive an extra config object — without it the
// consent decision is dropped because there is no storefront cookie domain
// Shopify can default to. Source: Shopify dev-docs, Headless Customer Privacy.
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

// Narrow subset we actually call. Shopify's API has more surface; we keep the
// shape to what Step 1 needs so future additions are explicit.
export type CustomerPrivacy = {
  currentVisitorConsent: () => VisitorConsent;
  setTrackingConsent: (
    consent: ConsentCategories,
    config: HeadlessConfig,
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
