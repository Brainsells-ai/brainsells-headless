// Central typed tracking API — the ONLY module that pushes funnel events
// into window.dataLayer. Components never call dataLayer.push directly;
// they call trackViewItem / trackAddToCart / trackBeginCheckout /
// trackPageView so the consent gate and the GA4 ecommerce shape live in
// exactly one place (multi-brand reuse per ADR 2026-06-03).
//
// Consent gate: every push re-reads Shopify customerPrivacy (Schritt 1) at
// push time — no cached snapshot can go stale, no event leaves the app
// before the visitor has granted analytics or marketing consent. Below the
// dataLayer line, Consent Mode v2 signals (gtm.ts) tell GTM which platform
// tags may actually fire.
//
// purchase is deliberately ABSENT: the order completes on the Shopify-hosted
// checkout domain, outside this app. Faking it client-side here would both
// undercount (app never sees the order) and break dedup. purchase is captured
// server-side via the Shopify checkout / web pixel into Stape (Schritt 3-4).
//
// event_id on add_to_cart / begin_checkout is the browser half of the later
// browser↔server dedup (Meta CAPI etc.). We only GENERATE and attach the id
// — dedup configuration itself is Stape dashboard work, not code.

import { getCustomerPrivacy } from '@/lib/consent/shopify-consent';
import type { ConsentCategories } from '@/lib/consent/types';
import type { Cart, CartLine } from '@/lib/shopify-cart';
import { ensureDataLayer, pushConsentDefault } from './gtm';

// ─── GA4 ecommerce types ───────────────────────────────────────────────────

export type Ga4Item = {
  // Variant GID — consistent across view_item / add_to_cart / begin_checkout
  // so item-scoped joins work downstream. Catalog-id remapping (e.g. Meta
  // catalog SKUs) is a GTM/Stape mapping decision, not a code concern.
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

type EcommercePayload = {
  currency: string;
  value: number;
  items: Ga4Item[];
};

type FunnelEvent =
  | { event: 'page_view'; page_path: string; page_location: string; page_title: string }
  | { event: 'view_item'; ecommerce: EcommercePayload }
  | { event: 'add_to_cart'; event_id: string; ecommerce: EcommercePayload }
  | { event: 'begin_checkout'; event_id: string; ecommerce: EcommercePayload };

// ─── Consent gate ──────────────────────────────────────────────────────────

// All four funnel events feed both analytics (GA4) and marketing (Meta /
// TikTok / Pinterest) consumers downstream, so either category licenses the
// dataLayer push; Consent Mode signals gate per-platform inside GTM. Kept as
// per-event config so tightening a single event later is a one-line change.
const REQUIRED_CONSENT: Record<FunnelEvent['event'], (keyof ConsentCategories)[]> = {
  page_view: ['analytics', 'marketing'],
  view_item: ['analytics', 'marketing'],
  add_to_cart: ['analytics', 'marketing'],
  begin_checkout: ['analytics', 'marketing'],
};

export function hasRequiredConsent(
  event: FunnelEvent['event'],
  consent: ConsentCategories | null,
): boolean {
  if (!consent) return false;
  return REQUIRED_CONSENT[event].some((category) => consent[category]);
}

function readConsent(): ConsentCategories | null {
  const api = getCustomerPrivacy();
  if (!api) return null;
  try {
    return api.currentVisitorConsent();
  } catch {
    return null;
  }
}

function push(payload: FunnelEvent): void {
  if (!hasRequiredConsent(payload.event, readConsent())) return;
  const dl = ensureDataLayer();
  if (!dl) return;
  // Consent Mode defaults must precede any event in the queue, even if
  // GtmLoader has not mounted yet (idempotent).
  pushConsentDefault();
  if ('ecommerce' in payload) {
    // GA4 convention: clear the previous ecommerce object so GTM data-layer
    // versioning never merges items across events.
    dl.push({ ecommerce: null });
  }
  dl.push(payload);
}

function newEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Insecure-context fallback (e.g. plain-http LAN preview) — uniqueness
  // suffices for dedup keys; cryptographic strength is not required.
  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Pure payload builders (unit-testable, no window access) ───────────────

export function ga4ItemFromCartLine(line: CartLine, quantity?: number): Ga4Item {
  return {
    item_id: line.variantId,
    item_name: line.productTitle,
    item_variant: line.variantTitle,
    price: Number(line.unitPrice.amount),
    quantity: quantity ?? line.quantity,
  };
}

export function buildAddToCartEcommerce(
  line: CartLine,
  quantity: number,
): EcommercePayload {
  const item = ga4ItemFromCartLine(line, quantity);
  return {
    currency: line.unitPrice.currencyCode,
    value: item.price * quantity,
    items: [item],
  };
}

export function buildBeginCheckoutEcommerce(cart: Cart): EcommercePayload {
  return {
    currency: cart.subtotal.currencyCode,
    value: Number(cart.subtotal.amount),
    items: cart.lines.map((line) => ga4ItemFromCartLine(line)),
  };
}

// ─── Public tracking functions ─────────────────────────────────────────────

export function trackPageView(pathname: string): void {
  if (typeof window === 'undefined') return;
  push({
    event: 'page_view',
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
}

// item is prebuilt server-side (PDP page.tsx) so the client island receives
// plain serializable props instead of the full ParsedProduct.
export function trackViewItem(item: Ga4Item, currency: string): void {
  push({
    event: 'view_item',
    ecommerce: {
      currency,
      value: item.price * item.quantity,
      items: [item],
    },
  });
}

// Fired from cart-store AFTER Shopify confirmed the mutation — price and
// title come from the returned cart line, not from UI props, so the event
// always reflects what Shopify actually charged.
export function trackAddToCart(line: CartLine, quantity: number): void {
  push({
    event: 'add_to_cart',
    event_id: newEventId(),
    ecommerce: buildAddToCartEcommerce(line, quantity),
  });
}

export function trackBeginCheckout(cart: Cart): void {
  push({
    event: 'begin_checkout',
    event_id: newEventId(),
    ecommerce: buildBeginCheckoutEcommerce(cart),
  });
}
