import { describe, expect, it, vi } from 'vitest';
import { normalizeShopifyOrder, OrderNotFulfillable, type ShopifyOrderPayload } from './normalize';
import type { VariantResolver } from './variant-mapping';

// Der Kern dieser Suite ist der HARD FAIL. normalize.ts ist bewusst pur (Resolver
// injiziert), damit genau dieser Pfad ohne Store und ohne Netz prüfbar ist — er
// soll nicht erst am echten Provider auffallen.

const ok: VariantResolver = vi.fn(async () => 4025);
const unknown: VariantResolver = vi.fn(async () => null);

function payload(over: Partial<ShopifyOrderPayload> = {}): ShopifyOrderPayload {
  return {
    id: 123,
    admin_graphql_api_id: 'gid://shopify/Order/123',
    name: '#1042',
    currency: 'EUR',
    total_price: '32.00',
    customer: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
    shipping_address: {
      address1: 'Teststraße 1',
      city: 'Wien',
      zip: '1010',
      country_code: 'AT',
    },
    line_items: [
      { id: 1, sku: 'SKU-1', title: 'Edition', quantity: 1, variant_id: 999 },
    ],
    ...over,
  };
}

const opts = (resolve: VariantResolver = ok) => ({ resolveVariant: resolve, defaultPlacement: 'front_large' });

describe('normalizeShopifyOrder — Happy Path', () => {
  it('bildet eine vollständige Order ab', async () => {
    const o = await normalizeShopifyOrder(payload(), opts());
    expect(o.id).toBe('gid://shopify/Order/123');
    expect(o.reference).toBe('#1042');
    expect(o.customer).toEqual({ email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' });
    expect(o.shippingAddress.country).toBe('AT');
    expect(o.currency).toBe('EUR');
    expect(o.totalAmount).toBe(32);
    expect(o.items).toHaveLength(1);
  });

  it('trägt die aufgelöste catalog_variant_id als Zahl in die Metadata', async () => {
    const o = await normalizeShopifyOrder(payload(), opts());
    expect(o.items[0].metadata.catalogVariantId).toBe(4025);
    expect(typeof o.items[0].metadata.catalogVariantId).toBe('number');
  });

  it('baut die Varianten-GID, wenn nur eine numerische variant_id kommt', async () => {
    const spy = vi.fn(async () => 4025);
    await normalizeShopifyOrder(payload(), opts(spy));
    expect(spy).toHaveBeenCalledWith('gid://shopify/ProductVariant/999');
  });

  it('nimmt Placement, Druckdatei und Provider-Override aus Line-Item-Properties', async () => {
    const o = await normalizeShopifyOrder(
      payload({
        line_items: [
          {
            id: 1, sku: 'SKU-1', quantity: 2, variant_id: 999,
            properties: [
              { name: 'placement', value: 'back' },
              { name: 'printFileUrl', value: 'https://example.com/f.png' },
              { name: 'fulfillmentProvider', value: 'mock' },
            ],
          },
        ],
      }),
      opts(),
    );
    expect(o.items[0].metadata.placement).toBe('back');
    expect(o.items[0].metadata.printFileUrl).toBe('https://example.com/f.png');
    expect(o.items[0].metadata.fulfillmentProvider).toBe('mock');
    expect(o.items[0].quantity).toBe(2);
  });

  it('fällt ohne Property auf das übergebene Default-Placement zurück', async () => {
    const o = await normalizeShopifyOrder(payload(), opts());
    expect(o.items[0].metadata.placement).toBe('front_large');
  });
});

describe('normalizeShopifyOrder — HARD FAIL, kein Skip, kein Default', () => {
  it('WIRFT bei einer Variante ohne Provider-Mapping', async () => {
    await expect(normalizeShopifyOrder(payload(), opts(unknown))).rejects.toThrow(
      OrderNotFulfillable,
    );
  });

  it('nennt in der Meldung die Variante, damit die Behebung ohne Nachforschung geht', async () => {
    await expect(normalizeShopifyOrder(payload(), opts(unknown))).rejects.toThrow(
      /gid:\/\/shopify\/ProductVariant\/999/,
    );
  });

  it('führt eine Order mit EINER unauflösbaren Position NICHT teilweise aus', async () => {
    // Zwei Positionen, die zweite ohne Mapping: die ganze Order muss scheitern.
    // Ein Skip würde eine bezahlte Position still aus der Produktion fallen lassen.
    const resolve: VariantResolver = vi
      .fn<(gid: string) => Promise<number | null>>()
      .mockResolvedValueOnce(4025)
      .mockResolvedValueOnce(null);
    await expect(
      normalizeShopifyOrder(
        payload({
          line_items: [
            { id: 1, sku: 'A', quantity: 1, variant_id: 111 },
            { id: 2, sku: 'B', quantity: 1, variant_id: 222 },
          ],
        }),
        opts(resolve),
      ),
    ).rejects.toThrow(/"B"/);
  });

  it('WIRFT bei fehlender variant_id', async () => {
    await expect(
      normalizeShopifyOrder(
        payload({ line_items: [{ id: 1, sku: 'A', quantity: 1, variant_id: null }] }),
        opts(),
      ),
    ).rejects.toThrow(/keine variant_id/);
  });

  it('WIRFT bei unvollständiger Lieferadresse', async () => {
    await expect(
      normalizeShopifyOrder(
        payload({ shipping_address: { address1: 'x', city: 'Wien', zip: '', country_code: 'AT' } }),
        opts(),
      ),
    ).rejects.toThrow(/Lieferadresse/);
  });

  it('WIRFT ohne E-Mail-Adresse', async () => {
    await expect(
      normalizeShopifyOrder(payload({ customer: null, email: undefined }), opts()),
    ).rejects.toThrow(/E-Mail/);
  });

  it('WIRFT bei leerer Positionsliste', async () => {
    await expect(normalizeShopifyOrder(payload({ line_items: [] }), opts())).rejects.toThrow(
      /keine Positionen/,
    );
  });

  it('WIRFT bei ungültiger Menge statt sie zu korrigieren', async () => {
    await expect(
      normalizeShopifyOrder(
        payload({ line_items: [{ id: 1, sku: 'A', quantity: 0, variant_id: 999 }] }),
        opts(),
      ),
    ).rejects.toThrow(/Menge/);
  });
});
