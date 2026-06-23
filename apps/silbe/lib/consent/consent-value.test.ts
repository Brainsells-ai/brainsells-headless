import { describe, expect, it } from 'vitest';
import { isConsentGranted } from './consent-value';

// The single predicate behind both the Consent-Mode bridge and the dataLayer
// event gate. Shopify's headless API returns 'yes'/'no'/'' strings; our own
// writes pass booleans. 'no' is a truthy string, so a boolean coercion would
// wrongly grant a rejected category — these cases pin the explicit rule.

describe('isConsentGranted', () => {
  it('grants on explicit affirmatives', () => {
    expect(isConsentGranted('yes')).toBe(true);
    expect(isConsentGranted('granted')).toBe(true);
    expect(isConsentGranted(true)).toBe(true);
  });

  it('denies on the truthy "no" string', () => {
    expect(isConsentGranted('no')).toBe(false);
  });

  it('denies on every other value (fail closed)', () => {
    expect(isConsentGranted('')).toBe(false);
    expect(isConsentGranted('denied')).toBe(false);
    expect(isConsentGranted(false)).toBe(false);
    expect(isConsentGranted(null)).toBe(false);
    expect(isConsentGranted(undefined)).toBe(false);
  });
});
