import { describe, expect, it } from 'vitest';
import type { Cart, CartLine } from '@/lib/shopify-cart';
import {
  buildAddToCartEcommerce,
  buildBeginCheckoutEcommerce,
  ga4ItemFromCartLine,
  hasRequiredConsent,
} from './events';

// Pure-mapping tests only — push/consent-read paths touch window/document
// and are covered by the type system + manual smoke (vitest runs in node).

function makeLine(overrides: Partial<CartLine> = {}): CartLine {
  return {
    id: 'gid://shopify/CartLine/1',
    quantity: 2,
    variantId: 'gid://shopify/ProductVariant/111',
    variantTitle: 'A3 (29.7 × 42 cm)',
    selectedOptions: [{ name: 'Format', value: 'A3 (29.7 × 42 cm)' }],
    availableForSale: true,
    unitPrice: { amount: '39.0', currencyCode: 'EUR' },
    linePrice: { amount: '78.0', currencyCode: 'EUR' },
    productHandle: 'rainer-maria-rilke-edition',
    productTitle: 'Rilke-Edition',
    image: null,
    ...overrides,
  };
}

describe('ga4ItemFromCartLine', () => {
  it('maps variant id, titles and numeric price', () => {
    const item = ga4ItemFromCartLine(makeLine());
    expect(item).toEqual({
      item_id: 'gid://shopify/ProductVariant/111',
      item_name: 'Rilke-Edition',
      item_variant: 'A3 (29.7 × 42 cm)',
      price: 39,
      quantity: 2,
    });
  });

  it('explicit quantity overrides the cumulative line quantity', () => {
    expect(ga4ItemFromCartLine(makeLine({ quantity: 5 }), 1).quantity).toBe(1);
  });
});

describe('buildAddToCartEcommerce', () => {
  it('values the delta quantity, not the line total', () => {
    // Line already holds 3 after the mutation; this add contributed 1.
    const payload = buildAddToCartEcommerce(makeLine({ quantity: 3 }), 1);
    expect(payload.currency).toBe('EUR');
    expect(payload.value).toBe(39);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].quantity).toBe(1);
  });
});

describe('buildBeginCheckoutEcommerce', () => {
  it('uses cart subtotal and maps every line', () => {
    const cart: Cart = {
      id: 'gid://shopify/Cart/1',
      checkoutUrl: 'https://checkout.example/c/1',
      totalQuantity: 3,
      subtotal: { amount: '117.0', currencyCode: 'EUR' },
      total: { amount: '117.0', currencyCode: 'EUR' },
      totalTax: null,
      lines: [
        makeLine(),
        makeLine({
          id: 'gid://shopify/CartLine/2',
          variantId: 'gid://shopify/ProductVariant/222',
          quantity: 1,
        }),
      ],
    };
    const payload = buildBeginCheckoutEcommerce(cart);
    expect(payload.value).toBe(117);
    expect(payload.currency).toBe('EUR');
    expect(payload.items.map((i) => i.item_id)).toEqual([
      'gid://shopify/ProductVariant/111',
      'gid://shopify/ProductVariant/222',
    ]);
  });
});

describe('hasRequiredConsent', () => {
  const denied = {
    analytics: false,
    marketing: false,
    preferences: false,
    sale_of_data: false,
  };

  it('blocks every event without a consent decision', () => {
    expect(hasRequiredConsent('page_view', null)).toBe(false);
    expect(hasRequiredConsent('add_to_cart', null)).toBe(false);
  });

  it('blocks when neither analytics nor marketing granted', () => {
    expect(hasRequiredConsent('view_item', denied)).toBe(false);
    expect(
      hasRequiredConsent('begin_checkout', { ...denied, preferences: true }),
    ).toBe(false);
  });

  it('allows with analytics-only or marketing-only', () => {
    expect(hasRequiredConsent('page_view', { ...denied, analytics: true })).toBe(true);
    expect(hasRequiredConsent('add_to_cart', { ...denied, marketing: true })).toBe(true);
  });

  // Shopify's headless currentVisitorConsent() returns 'yes'/'no'/'' strings,
  // not booleans. 'no' is truthy, so the old `consent[category]` truthiness
  // check let events through for a visitor who declined — guard that here.
  it('grants on the "yes" string but never on "no"/"" (the truthy-string trap)', () => {
    expect(hasRequiredConsent('page_view', { analytics: 'yes', marketing: 'no' })).toBe(true);
    expect(hasRequiredConsent('view_item', { analytics: 'no', marketing: 'no' })).toBe(false);
    expect(hasRequiredConsent('add_to_cart', { analytics: '', marketing: '' })).toBe(false);
  });
});
