import { describe, expect, it } from 'vitest';
import { toConsentModeSignals } from './gtm';

// Regression coverage for the Consent-Mode bridge bug (verified via Production
// browser console): after the visitor accepted, currentVisitorConsent() returned
// { marketing:'yes', analytics:'yes', preferences:'yes', sale_of_data:'no' } —
// STRING values, not booleans — yet google_tag_data.ics never updated to
// granted. The mapping used boolean truthiness, and the string 'no' is truthy,
// so the old code both failed to model 'yes'→granted intentionally AND would
// have wrongly granted 'no'. These tests pin the explicit 'yes'/'no'/'' mapping
// for the headless string shape and the boolean shape from our own writes.

describe('toConsentModeSignals — Shopify "yes"/"no" string shape', () => {
  it('analytics:"yes" → analytics_storage granted', () => {
    expect(toConsentModeSignals({ analytics: 'yes' }).analytics_storage).toBe(
      'granted',
    );
  });

  it('analytics:"no" → analytics_storage denied (the truthy-string trap)', () => {
    expect(toConsentModeSignals({ analytics: 'no' }).analytics_storage).toBe(
      'denied',
    );
  });

  it('analytics:"" (undecided) → analytics_storage denied', () => {
    expect(toConsentModeSignals({ analytics: '' }).analytics_storage).toBe(
      'denied',
    );
  });

  it('marketing:"yes" → all three ad signals granted', () => {
    const s = toConsentModeSignals({ marketing: 'yes' });
    expect(s.ad_storage).toBe('granted');
    expect(s.ad_user_data).toBe('granted');
    expect(s.ad_personalization).toBe('granted');
  });

  it('marketing:"no" → all three ad signals denied', () => {
    const s = toConsentModeSignals({ marketing: 'no' });
    expect(s.ad_storage).toBe('denied');
    expect(s.ad_user_data).toBe('denied');
    expect(s.ad_personalization).toBe('denied');
  });

  it('full accept object maps to all-granted', () => {
    expect(
      toConsentModeSignals({
        marketing: 'yes',
        analytics: 'yes',
        preferences: 'yes',
        sale_of_data: 'no',
      }),
    ).toEqual({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  });

  it('mixed: analytics granted, marketing denied', () => {
    expect(toConsentModeSignals({ analytics: 'yes', marketing: 'no' })).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
  });
});

describe('toConsentModeSignals — boolean shape (in-session writes)', () => {
  it('true → granted', () => {
    expect(
      toConsentModeSignals({ analytics: true, marketing: true }),
    ).toEqual({
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
  });

  it('false → denied', () => {
    expect(
      toConsentModeSignals({ analytics: false, marketing: false }),
    ).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });
});

describe('toConsentModeSignals — defensive defaults', () => {
  it('"granted"/"denied" API surface still maps correctly', () => {
    expect(
      toConsentModeSignals({ analytics: 'granted', marketing: 'denied' }),
    ).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    });
  });

  it('undefined / empty object → all denied (fail closed)', () => {
    expect(toConsentModeSignals({})).toEqual({
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
  });
});
