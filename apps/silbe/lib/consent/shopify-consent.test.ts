import { describe, expect, it, vi } from 'vitest';
import { type CustomerPrivacy, writeTrackingConsent } from './shopify-consent';
import type { ConsentCategories } from './types';

// Regression coverage for the consent-WRITE bug (verified via Production
// browser console, click on "Alle akzeptieren"):
//   ConsentValidationError: setTrackingConsent received an invalid callback of
//   type "object". The second argument must be a function if provided.
// The wrapper passed the headless config OBJECT as the second argument, where
// Shopify's headless Customer Privacy API expects the success callback. The
// call threw before the callback ran, so the banner never closed and no
// consent was recorded.
//
// Correct headless shape (https://shopify.dev/docs/api/customer-privacy):
//   setTrackingConsent(
//     { ...consent, headlessStorefront: true, checkoutRootDomain,
//       storefrontRootDomain, storefrontAccessToken },
//     () => { ... },
//   )
// → arg 1 is ONE object (consent categories + headless config), arg 2 is a
//   function. These tests pin exactly that.

const CONSENT: ConsentCategories = {
  analytics: true,
  marketing: true,
  preferences: true,
  sale_of_data: false,
};

const CONFIG = {
  headlessStorefront: true as const,
  checkoutRootDomain: 'checkout.silbe.at',
  storefrontRootDomain: 'silbe.at',
  storefrontAccessToken: 'test-token',
};

function makeApi() {
  const setTrackingConsent = vi.fn();
  const api: CustomerPrivacy = {
    currentVisitorConsent: () => null,
    setTrackingConsent,
  };
  return { api, setTrackingConsent };
}

describe('writeTrackingConsent — Shopify headless call shape', () => {
  it('calls setTrackingConsent exactly once', () => {
    const { api, setTrackingConsent } = makeApi();
    writeTrackingConsent(api, CONSENT, CONFIG, () => {});
    expect(setTrackingConsent).toHaveBeenCalledTimes(1);
  });

  it('passes ONE merged object (consent + headless config) as the FIRST argument', () => {
    const { api, setTrackingConsent } = makeApi();
    writeTrackingConsent(api, CONSENT, CONFIG, () => {});
    const payload = setTrackingConsent.mock.calls[0][0];
    expect(payload).toEqual({ ...CONSENT, ...CONFIG });
    // Both halves live in the same object — consent categories…
    expect(payload.analytics).toBe(true);
    expect(payload.sale_of_data).toBe(false);
    // …and the headless config.
    expect(payload.headlessStorefront).toBe(true);
    expect(payload.storefrontAccessToken).toBe('test-token');
  });

  it('passes a FUNCTION as the SECOND argument — the original ConsentValidationError guard', () => {
    const { api, setTrackingConsent } = makeApi();
    const onWritten = vi.fn();
    writeTrackingConsent(api, CONSENT, CONFIG, onWritten);
    const secondArg = setTrackingConsent.mock.calls[0][1];
    expect(typeof secondArg).toBe('function');
    // It is the success callback we handed in, not some other function.
    secondArg();
    expect(onWritten).toHaveBeenCalledTimes(1);
  });

  it('NEVER passes the config object as the second argument (the exact production failure)', () => {
    const { api, setTrackingConsent } = makeApi();
    writeTrackingConsent(api, CONSENT, CONFIG, () => {});
    expect(typeof setTrackingConsent.mock.calls[0][1]).not.toBe('object');
  });
});
