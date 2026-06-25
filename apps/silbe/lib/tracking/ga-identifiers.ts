// Browser-side capture of the GA4 client_id + session_id into Shopify cart
// attributes — the storefront half of "Weg A" server-side refund attribution.
//
// The refund event is sent server-side from the refunds/create webhook, where
// there is no browser and no _ga cookie. To still attribute the refund to the
// original purchase's GA user, we persist the client_id (and session_id) at
// begin_checkout: cart attributes ride through to the order's customAttributes,
// which the webhook reads back. See lib/tracking/ga-cart-attributes.ts.
//
// Consent: analytics-only gate. We mirror the dataLayer push gate (events.ts)
// but require ANALYTICS specifically — persisting a GA identifier is an
// analytics-storage decision, not a marketing one. Without analytics consent we
// write nothing (fail closed), consistent with Consent Mode v2.

import { isConsentGranted } from '@/lib/consent/consent-value';
import { getCustomerPrivacy } from '@/lib/consent/shopify-consent';
import { updateCartAttributes } from '@/lib/shopify-cart';
import { GA_CLIENT_ID_ATTR, GA_SESSION_ID_ATTR } from './ga-cart-attributes';

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

// ─── Public capture ─────────────────────────────────────────────────────────

// Fire-and-forget at begin_checkout. Persists the GA identifiers onto the cart
// (→ order customAttributes) when analytics consent is granted and the _ga
// cookie exists. Never throws and never blocks checkout: a failed capture only
// costs refund attribution, which falls back to a synthetic client_id server
// side.
export async function captureGaIdentifiersToCart(cartId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!analyticsConsentGranted()) return;

  const { clientId, sessionId } = readGaIdentifiers();
  if (!clientId) return; // GA cookie not set yet — nothing to persist.

  const attributes = [{ key: GA_CLIENT_ID_ATTR, value: clientId }];
  if (sessionId) attributes.push({ key: GA_SESSION_ID_ATTR, value: sessionId });

  try {
    // keepalive: the click navigates to the Shopify checkout domain; without it
    // the browser would abort this request mid-flight.
    await updateCartAttributes(cartId, attributes, { keepalive: true });
  } catch (err) {
    console.error('[ga-identifiers] cart attribute capture failed:', err);
  }
}
