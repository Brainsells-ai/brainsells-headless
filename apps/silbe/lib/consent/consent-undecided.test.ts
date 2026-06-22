import { describe, expect, it } from 'vitest';
import { hasNoDecision } from './ConsentProvider';

// Regression coverage for the never-opening-banner bug (PR #43 shipped the
// consent path with ZERO tests; the strict `current === null` check meant the
// banner never opened on the headless Production storefront).
//
// Shopify's headless Customer Privacy API returns an OBJECT with empty-string
// fields for an undecided visitor — never null. hasNoDecision() must treat
// that object exactly like null, while still recognising a recorded decision
// (granted/denied/boolean) so a returning visitor is not re-prompted.

describe('hasNoDecision — undecided detection', () => {
  it('null → undecided (banner opens)', () => {
    expect(hasNoDecision(null)).toBe(true);
  });

  it('undefined → undecided (banner opens)', () => {
    expect(hasNoDecision(undefined)).toBe(true);
  });

  it('headless empty-string object → undecided (the actual Production shape)', () => {
    expect(
      hasNoDecision({
        marketing: '',
        analytics: '',
        preferences: '',
        sale_of_data: '',
      }),
    ).toBe(true);
  });
});

describe('hasNoDecision — recorded decision keeps banner closed', () => {
  it('all granted → decided', () => {
    expect(
      hasNoDecision({
        marketing: 'granted',
        analytics: 'granted',
        preferences: 'granted',
        sale_of_data: 'granted',
      }),
    ).toBe(false);
  });

  it('all denied → decided (rejected visitor is not re-prompted)', () => {
    expect(
      hasNoDecision({
        marketing: 'denied',
        analytics: 'denied',
        preferences: 'denied',
        sale_of_data: 'denied',
      }),
    ).toBe(false);
  });

  it('boolean false fields (our own ALL_DENIED write shape) → decided', () => {
    expect(
      hasNoDecision({
        marketing: false,
        analytics: false,
        preferences: false,
        sale_of_data: false,
      }),
    ).toBe(false);
  });

  it('boolean true fields → decided', () => {
    expect(
      hasNoDecision({
        marketing: true,
        analytics: true,
        preferences: true,
        sale_of_data: true,
      }),
    ).toBe(false);
  });

  it('partial decision — any one answered category counts as decided', () => {
    expect(
      hasNoDecision({
        marketing: 'granted',
        analytics: '',
        preferences: '',
        sale_of_data: '',
      }),
    ).toBe(false);
  });

  it('sale_of_data is NOT banner-relevant — alone it does not count as decided', () => {
    // Only sale_of_data answered, the three UI categories still empty → the
    // banner must still open. Guards the category-subset choice.
    expect(
      hasNoDecision({
        marketing: '',
        analytics: '',
        preferences: '',
        sale_of_data: 'denied',
      }),
    ).toBe(true);
  });
});
