// Shared semantics for a single Shopify Customer Privacy consent value.
//
// Shopify's headless currentVisitorConsent() returns STRING values per
// category — 'yes' | 'no' | '' (verified via Production console) — while our
// own in-session writes (ConsentProvider ALL_ACCEPTED / ALL_DENIED) pass
// booleans. Any code reading consent must handle BOTH shapes and must NOT rely
// on truthiness: the string 'no' is truthy, so `value ? granted : denied`
// wrongly grants a rejected category. isConsentGranted() is the ONE predicate
// shared by the Consent-Mode bridge (lib/tracking/gtm.ts) and the dataLayer
// event gate (lib/tracking/events.ts) so the 'yes'/'no' rule lives in one place.

import type { ConsentCategories } from './types';

export type ConsentFieldValue = boolean | string | null | undefined;

// Tolerant per-category input. Keyed off ConsentCategories so the category set
// stays in lockstep with the canonical type.
export type ConsentInput = Partial<
  Record<keyof ConsentCategories, ConsentFieldValue>
>;

// GRANTED only on an explicit affirmative: Shopify's 'yes', the API's
// 'granted', or a boolean true. EVERYTHING else — 'no', '' (undecided),
// 'denied', false, null, undefined — is DENIED (fail closed).
export function isConsentGranted(value: ConsentFieldValue): boolean {
  return value === true || value === 'yes' || value === 'granted';
}
