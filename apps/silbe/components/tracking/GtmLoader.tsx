'use client';

// Consent-gated loader for the WEB-GTM container (NEXT_PUBLIC_GTM_ID).
//
// Lifecycle:
//   mount            → Consent Mode v2 default: all four signals 'denied',
//                      pushed BEFORE gtm.js can possibly load.
//   consent granted  → gtag('consent','update',…) + inject gtm.js exactly
//                      once (async script, never render-blocking).
//   consent changed  → consent update only; gtm.js stays loaded, Consent
//                      Mode silences the platform tags inside GTM.
//
// Two consent sources are wired, both from Schritt 1:
//   1. useConsent() context — covers initial read + banner interactions.
//   2. document 'visitorConsentCollected' — Shopify customerPrivacy fires
//      this on every setTrackingConsent, including writes that bypass the
//      React context. Handler re-reads the API, so detail-shape drift in
//      Shopify's event payload cannot bite us.
//
// Renders nothing. Mounted once in (frontend)/layout.tsx inside
// <ConsentProvider>. Without NEXT_PUBLIC_GTM_ID this is a silent no-op
// (one dev-only console.warn) — CI and local dev keep working untouched.

import { useEffect } from 'react';
import { useConsent } from '@/lib/consent/ConsentProvider';
import { getCustomerPrivacy } from '@/lib/consent/shopify-consent';
import type { ConsentCategories } from '@/lib/consent/types';
import { getGtmId, injectGtm, pushConsentDefault, pushConsentUpdate } from '@/lib/tracking/gtm';

function applyConsent(consent: ConsentCategories): void {
  pushConsentUpdate(consent);
  const gtmId = getGtmId();
  if (gtmId && (consent.analytics || consent.marketing)) {
    injectGtm(gtmId);
  }
}

export function GtmLoader() {
  const { consent } = useConsent();

  // Consent Mode default before anything else can enter the queue.
  useEffect(() => {
    pushConsentDefault();
    if (process.env.NODE_ENV !== 'production' && !getGtmId()) {
      console.warn('[tracking] NEXT_PUBLIC_GTM_ID not set — GTM stays off');
    }
  }, []);

  // Source 1: React consent context (initial read + banner actions).
  useEffect(() => {
    if (consent) applyConsent(consent);
  }, [consent]);

  // Source 2: Shopify-native event, covers non-context writes.
  useEffect(() => {
    function onVisitorConsentCollected() {
      const current = getCustomerPrivacy()?.currentVisitorConsent() ?? null;
      if (current) applyConsent(current);
    }
    document.addEventListener('visitorConsentCollected', onVisitorConsentCollected);
    return () =>
      document.removeEventListener('visitorConsentCollected', onVisitorConsentCollected);
  }, []);

  return null;
}
