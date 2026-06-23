'use client';

// React context + Shopify Consent-Tracking-API script loader. Mounted once in
// the (frontend) root layout so any client island can read consent state via
// useConsent().
//
// State machine:
//   - script not loaded                → ready=false, consent=null
//   - script loaded, no prior decision → ready=true, consent=empty-object, banner opens
//   - script loaded, prior decision    → ready=true, consent={...granted/denied}, banner stays closed
//   - user clicks accept/reject        → setTrackingConsent → consent set, banner closes
//
// "no prior decision" is NOT null on a headless storefront: Shopify's
// currentVisitorConsent() returns an object whose category fields are empty
// strings ({ marketing: '', analytics: '', ... }). See hasNoDecision() below.
//
// "configured" gates the banner: without the three required env values
// (checkout-root-domain, storefront-root-domain, storefront-access-token) the
// setTrackingConsent call would no-op silently, so we refuse to even open the
// banner. Renders nothing visible if misconfigured — banner stays hidden, no
// fake consent UI.

import Script from 'next/script';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import {
  CONSENT_API_SRC,
  buildHeadlessConfig,
  getCustomerPrivacy,
  writeTrackingConsent,
} from './shopify-consent';
import type { ConsentCategories, VisitorConsent } from './types';

type ConsentContextValue = {
  // Shopify.customerPrivacy is available on window.
  ready: boolean;
  // All three required env values are present. Without them the API call would
  // silently fail in headless mode, so we refuse to write — banner stays closed.
  configured: boolean;
  // Latest known consent (Shopify-side). null = visitor has not decided yet.
  consent: VisitorConsent;
  hasResponded: boolean;
  isBannerOpen: boolean;
  // For /cookie-einstellungen to re-open the banner once that page is wired
  // up. No-op if not configured.
  openBanner: () => void;
  acceptAll: () => void;
  rejectAll: () => void;
  // Partial selection from the inline Einstellungen panel. Unspecified
  // categories default to denied so the payload stays well-formed.
  acceptSelection: (selection: Partial<ConsentCategories>) => void;
};

// ─── "No decision yet" detection ───────────────────────────────────────────
//
// Root cause of the never-opening banner (verified via Production console):
// Shopify's HEADLESS Customer Privacy API does NOT return null for an
// undecided visitor. currentVisitorConsent() yields an object whose category
// fields are EMPTY STRINGS, e.g. { marketing: '', analytics: '',
// preferences: '', sale_of_data: '' }. A recorded decision replaces those
// with a concrete value (boolean true/false from our own writes, or
// 'granted'/'denied' depending on API surface). The original `current === null`
// check was therefore never true → setIsBannerOpen(true) never ran.
//
// hasNoDecision() treats a visitor as undecided when consent is null/undefined
// OR when every banner-relevant category (analytics/marketing/preferences —
// sale_of_data is not surfaced in the UI) is empty/undefined. ANY concrete
// value — including boolean false or 'denied' — counts as an answer and keeps
// the banner closed, so a returning visitor who rejected is never re-prompted.

// Loose shape mirroring what Shopify returns at runtime. The typed
// VisitorConsent (boolean category fields) is assignable to this.
type ConsentFieldValue = boolean | string | null | undefined;
type RawVisitorConsent =
  | {
      analytics?: ConsentFieldValue;
      marketing?: ConsentFieldValue;
      preferences?: ConsentFieldValue;
      sale_of_data?: ConsentFieldValue;
    }
  | null
  | undefined;

// A single category is "answered" when it holds any concrete value. Empty
// string (Shopify's headless "no answer"), undefined and null are the only
// unanswered states; boolean false and 'denied' ARE answers.
function isAnswered(value: ConsentFieldValue): boolean {
  return value !== '' && value !== undefined && value !== null;
}

export function hasNoDecision(consent: RawVisitorConsent): boolean {
  if (consent == null) return true;
  return (
    !isAnswered(consent.analytics) &&
    !isAnswered(consent.marketing) &&
    !isAnswered(consent.preferences)
  );
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error('useConsent must be used inside <ConsentProvider>');
  }
  return ctx;
}

const ALL_DENIED: ConsentCategories = {
  analytics: false,
  marketing: false,
  preferences: false,
  sale_of_data: false,
};
const ALL_ACCEPTED: ConsentCategories = {
  analytics: true,
  marketing: true,
  preferences: true,
  sale_of_data: true,
};

export function ConsentProvider({ children }: { children: ReactNode }) {
  const checkoutRootDomain =
    process.env.NEXT_PUBLIC_SILBE_CONSENT_CHECKOUT_DOMAIN;
  const storefrontRootDomain =
    process.env.NEXT_PUBLIC_SILBE_CONSENT_STOREFRONT_DOMAIN;
  const storefrontAccessToken =
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;

  const configured = Boolean(
    checkoutRootDomain && storefrontRootDomain && storefrontAccessToken,
  );

  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<VisitorConsent>(null);
  const [isBannerOpen, setIsBannerOpen] = useState(false);

  // next/script fires onLoad once per actual load and onReady on each mount
  // when the script is already loaded. Both call into this — idempotent reads
  // and setReady(true) make double-call safe.
  const onScriptReady = useCallback(() => {
    const api = getCustomerPrivacy();
    if (!api) {
      console.warn(
        '[consent] script loaded but Shopify.customerPrivacy not present',
      );
      return;
    }
    setReady(true);
    try {
      const current = api.currentVisitorConsent();
      setConsent(current);
      // Headless Shopify returns an empty-string object (not null) for an
      // undecided visitor — hasNoDecision() covers both. Without this the
      // banner never opened on Production.
      if (hasNoDecision(current) && configured) {
        setIsBannerOpen(true);
      }
    } catch (err) {
      console.warn('[consent] reading currentVisitorConsent failed:', err);
    }
  }, [configured]);

  const writeConsent = useCallback(
    (next: ConsentCategories) => {
      const api = getCustomerPrivacy();
      if (!api) {
        console.warn('[consent] writeConsent called before script ready');
        return;
      }
      if (!configured) {
        console.warn(
          '[consent] missing env (NEXT_PUBLIC_SILBE_CONSENT_*); refusing to write',
        );
        return;
      }
      const config = buildHeadlessConfig({
        checkoutRootDomain: checkoutRootDomain as string,
        storefrontRootDomain: storefrontRootDomain as string,
        storefrontAccessToken: storefrontAccessToken as string,
      });
      try {
        // Shopify's headless API takes consent + config as ONE object (arg 1)
        // and the success callback as arg 2. Passing config as arg 2 throws
        // ConsentValidationError, so the banner never closes and the decision
        // is never recorded. writeTrackingConsent enforces the correct shape.
        writeTrackingConsent(api, next, config, () => {
          setConsent(next);
          setIsBannerOpen(false);
        });
      } catch (err) {
        console.warn('[consent] setTrackingConsent threw:', err);
      }
    },
    [
      checkoutRootDomain,
      storefrontRootDomain,
      storefrontAccessToken,
      configured,
    ],
  );

  const acceptAll = useCallback(() => writeConsent(ALL_ACCEPTED), [writeConsent]);
  const rejectAll = useCallback(() => writeConsent(ALL_DENIED), [writeConsent]);
  const acceptSelection = useCallback(
    (selection: Partial<ConsentCategories>) => {
      writeConsent({ ...ALL_DENIED, ...selection });
    },
    [writeConsent],
  );
  const openBanner = useCallback(() => {
    if (configured) setIsBannerOpen(true);
  }, [configured]);

  const value: ConsentContextValue = {
    ready,
    configured,
    consent,
    hasResponded: consent !== null,
    isBannerOpen,
    openBanner,
    acceptAll,
    rejectAll,
    acceptSelection,
  };

  return (
    <ConsentContext.Provider value={value}>
      <Script
        src={CONSENT_API_SRC}
        strategy="afterInteractive"
        onLoad={onScriptReady}
        onReady={onScriptReady}
      />
      {children}
    </ConsentContext.Provider>
  );
}
