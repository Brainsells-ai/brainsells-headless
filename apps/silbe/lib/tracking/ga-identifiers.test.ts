import { describe, it, expect } from 'vitest';
import { parseGaClientId, parseGaSessionId, buildCheckoutAttributes } from './ga-identifiers';
import {
  GA_CLIENT_ID_ATTR,
  GA_SESSION_ID_ATTR,
  MARKETING_CONSENT_ATTR,
} from './ga-cart-attributes';

describe('parseGaClientId', () => {
  it('extracts client_id from a GA1.1.<a>.<b> cookie', () => {
    expect(parseGaClientId('GA1.1.1234567890.1700000000')).toBe('1234567890.1700000000');
  });
  it('returns null for malformed / empty', () => {
    expect(parseGaClientId('GA1.1.only')).toBeNull();
    expect(parseGaClientId('')).toBeNull();
    expect(parseGaClientId(null)).toBeNull();
  });
});

describe('parseGaSessionId', () => {
  it('extracts session_id from a GS1.1.<sid>.<...> cookie', () => {
    expect(parseGaSessionId('GS1.1.1700000000.3.1.1700000100')).toBe('1700000000');
  });
  it('returns null for malformed', () => {
    expect(parseGaSessionId('GS1.1')).toBeNull();
    expect(parseGaSessionId(undefined)).toBeNull();
  });
});

describe('buildCheckoutAttributes — independent gates, single write', () => {
  it('analytics granted + clientId + marketing granted → all three attrs', () => {
    expect(
      buildCheckoutAttributes({
        analyticsGranted: true,
        clientId: '111.222',
        sessionId: '333',
        marketingConsent: 'granted',
      }),
    ).toEqual([
      { key: GA_CLIENT_ID_ATTR, value: '111.222' },
      { key: GA_SESSION_ID_ATTR, value: '333' },
      { key: MARKETING_CONSENT_ATTR, value: 'granted' },
    ]);
  });

  it('analytics granted, clientId present, no sessionId → GA client + marketing only', () => {
    expect(
      buildCheckoutAttributes({
        analyticsGranted: true,
        clientId: '111.222',
        sessionId: null,
        marketingConsent: 'denied',
      }),
    ).toEqual([
      { key: GA_CLIENT_ID_ATTR, value: '111.222' },
      { key: MARKETING_CONSENT_ATTR, value: 'denied' },
    ]);
  });

  // The reason marketing consent must NOT hang off the analytics gate.
  it('analytics DENIED but marketing GRANTED → marketing attr survives, no GA ids', () => {
    expect(
      buildCheckoutAttributes({
        analyticsGranted: false,
        clientId: '111.222', // present, but analytics denied → must be dropped
        sessionId: '333',
        marketingConsent: 'granted',
      }),
    ).toEqual([{ key: MARKETING_CONSENT_ATTR, value: 'granted' }]);
  });

  it('analytics granted but NO clientId (cookie missing) → no GA ids, marketing still written', () => {
    expect(
      buildCheckoutAttributes({
        analyticsGranted: true,
        clientId: null,
        sessionId: '333',
        marketingConsent: 'denied',
      }),
    ).toEqual([{ key: MARKETING_CONSENT_ATTR, value: 'denied' }]);
  });

  it('marketing consent unknown (api unavailable) → no marketing attr', () => {
    expect(
      buildCheckoutAttributes({
        analyticsGranted: true,
        clientId: '111.222',
        sessionId: null,
        marketingConsent: null,
      }),
    ).toEqual([{ key: GA_CLIENT_ID_ATTR, value: '111.222' }]);
  });

  it('nothing known → empty (caller skips the write)', () => {
    expect(
      buildCheckoutAttributes({
        analyticsGranted: false,
        clientId: null,
        sessionId: null,
        marketingConsent: null,
      }),
    ).toEqual([]);
  });
});
