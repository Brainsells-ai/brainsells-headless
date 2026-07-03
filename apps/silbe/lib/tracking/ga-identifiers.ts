// Browser-side capture of checkout attributes into the Shopify cart — the
// storefront half of server-side "Weg A". Two INDEPENDENT signals ride onto the
// cart (→ order customAttributes) at begin_checkout, written in ONE mutation:
//
//   1. GA4 client_id + session_id — analytics-consent-gated. Lets the
//      refunds/create webhook attribute the server-side refund to the original
//      purchase's GA user (no browser / no _ga cookie server-side).
//   2. _marketing_consent (granted|denied) — MARKETING-consent-gated,
//      INDEPENDENT of the analytics gate. Lets the orders/paid webhook decide
//      whether it may attach CAPI user_data to the Meta/TikTok/Pinterest tags.
//
// Why one mutation, not two: cartAttributesUpdate REPLACES the full attribute
// set (it does not merge), so a second call would clobber the first. The two
// GATES stay independent (each signal is included on its own consent
// condition); only the WRITE is shared. Critically, "analytics denied but
// marketing granted" still persists _marketing_consent — it must not hang off
// the analytics gate.
//
// Consent model: persisting a GA identifier is an analytics-storage decision;
// the marketing-consent flag is an ad-consent decision. Each fails closed on its
// own category, consistent with Consent Mode v2.

import { isConsentGranted } from '@/lib/consent/consent-value';
import { getCustomerPrivacy } from '@/lib/consent/shopify-consent';
import { updateCartAttributes } from '@/lib/shopify-cart';
import {
  GA_CLIENT_ID_ATTR,
  GA_SESSION_ID_ATTR,
  MARKETING_CONSENT_ATTR,
  type MarketingConsentValue,
} from './ga-cart-attributes';

// ─── Pure parsers (unit-testable, no document access) ───────────────────────

// `_ga` cookie value: "GA1.1.<part1>.<part2>" → client_id = "<part1>.<part2>".
// The GA4 client_id is everything after the version + domain-depth prefix.
export function parseGaClientId(gaCookieValue: string | null | undefined): string | null {
  if (!gaCookieValue) return null;
  const parts = gaCookieValue.split('.');
  if (parts.length < 4) return null;
  const clientId = parts.slice(2).join('.');
  return clientId.length > 0 ? clientId : null;
}

// `_ga_<STREAM>` cookie value: "GS1.1.<session_id>.<...>" → session_id is the
// first numeric segment after the "GS1.1" prefix.
export function parseGaSessionId(gaSessionCookieValue: string | null | undefined): string | null {
  if (!gaSessionCookieValue) return null;
  const parts = gaSessionCookieValue.split('.');
  if (parts.length < 3) return null;
  return parts[2].length > 0 ? parts[2] : null;
}

// ─── Browser cookie readers ─────────────────────────────────────────────────

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return null;
}

// The session cookie name is "_ga_" + the measurement id without "G-"
// (e.g. _ga_Z06HHP6EFM). We discover it generically instead of hardcoding the
// stream id, so a measurement-id change never silently drops session_id.
function readGaSessionCookieValue(): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split('; ')) {
    if (/^_ga_[A-Z0-9]+=/.test(part)) {
      return decodeURIComponent(part.slice(part.indexOf('=') + 1));
    }
  }
  return null;
}

export function readGaIdentifiers(): { clientId: string | null; sessionId: string | null } {
  return {
    clientId: parseGaClientId(readCookie('_ga')),
    sessionId: parseGaSessionId(readGaSessionCookieValue()),
  };
}

function analyticsConsentGranted(): boolean {
  const api = getCustomerPrivacy();
  if (!api) return false;
  try {
    return isConsentGranted(api.currentVisitorConsent()?.analytics);
  } catch {
    return false;
  }
}

// Tri-state on purpose: 'granted' | 'denied' when the Customer Privacy API can
// be read, else null (API not loaded / read threw) → we persist NOTHING and the
// webhook treats an absent attribute as no consent (fail closed). Independent of
// the analytics gate above. An undecided/empty category folds to 'denied' via
// isConsentGranted — no explicit ad consent ⇒ no user_data.
function readMarketingConsent(): MarketingConsentValue | null {
  const api = getCustomerPrivacy();
  if (!api) return null;
  try {
    return isConsentGranted(api.currentVisitorConsent()?.marketing) ? 'granted' : 'denied';
  } catch {
    return null;
  }
}

// ─── Pure attribute composer (unit-testable, no window access) ──────────────

// Composes the cart attribute list from the two independent signals. GA ids are
// included only under analytics consent AND a present client_id; the marketing
// flag is included whenever it is known (non-null), on its OWN gate. Returns []
// when there is nothing to persist so the caller can skip the write entirely.
export function buildCheckoutAttributes(input: {
  analyticsGranted: boolean;
  clientId: string | null;
  sessionId: string | null;
  marketingConsent: MarketingConsentValue | null;
}): { key: string; value: string }[] {
  const attributes: { key: string; value: string }[] = [];
  if (input.analyticsGranted && input.clientId) {
    attributes.push({ key: GA_CLIENT_ID_ATTR, value: input.clientId });
    if (input.sessionId) attributes.push({ key: GA_SESSION_ID_ATTR, value: input.sessionId });
  }
  if (input.marketingConsent) {
    attributes.push({ key: MARKETING_CONSENT_ATTR, value: input.marketingConsent });
  }
  return attributes;
}

// ─── Public capture ─────────────────────────────────────────────────────────

// Fire-and-forget at begin_checkout. Persists the GA identifiers (analytics
// consent) and the marketing-consent flag (marketing consent, independent) onto
// the cart → order customAttributes, in a SINGLE cartAttributesUpdate. Never
// throws and never blocks checkout: a failed capture only costs refund
// attribution (synthetic client_id fallback server-side) and CAPI match quality.
export async function captureCheckoutAttributes(cartId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  const { clientId, sessionId } = readGaIdentifiers();
  const attributes = buildCheckoutAttributes({
    analyticsGranted: analyticsConsentGranted(),
    clientId,
    sessionId,
    marketingConsent: readMarketingConsent(),
  });
  if (attributes.length === 0) return;

  try {
    // keepalive: the click navigates to the Shopify checkout domain; without it
    // the browser would abort this request mid-flight.
    await updateCartAttributes(cartId, attributes, { keepalive: true });
  } catch (err) {
    console.error('[ga-identifiers] cart attribute capture failed:', err);
  }
}
