'use client';

// React context + Shopify Consent-Tracking-API script loader. Mounted once in
// the (frontend) root layout so any client island can read consent state via
// useConsent().
//
// State machine:
//   - script not loaded               → ready=false, consent=null
//   - script loaded, no prior decision → ready=true, consent=null, banner opens
//   - script loaded, prior decision   → ready=true, consent={...}, banner stays closed
//   - user clicks accept/reject        → setTrackingConsent → consent set, banner closes
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
      if (current === null && configured) {
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
        api.setTrackingConsent(next, config, () => {
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
