import { describe, expect, it, vi } from 'vitest';
import { normalizeShopifyOrder, OrderNotFulfillable, type ShopifyOrderPayload } from './normalize';
import type { VariantResolver } from './variant-mapping';

// Der Kern dieser Suite ist der HARD FAIL. normalize.ts ist bewusst pur (Resolver
// injiziert), damit genau dieser Pfad ohne Store und ohne Netz prüfbar ist — er
// soll nicht erst am echten Provider auffallen.

const ok: VariantResolver = vi.fn(async () => ({ catalogVariantId: '4025', provider: null, placement: 'front_large' }));
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

const opts = (resolve: VariantResolver = ok) => ({ resolveVariant: resolve });

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
    expect(o.items[0].metadata.catalogVariantId).toBe('4025');
    expect(typeof o.items[0].metadata.catalogVariantId).toBe('string');
  });

  it('baut die Varianten-GID, wenn nur eine numerische variant_id kommt', async () => {
    const spy: VariantResolver = vi.fn(async () => ({ catalogVariantId: '4025', provider: null, placement: 'front_large' }));
    await normalizeShopifyOrder(payload(), opts(spy));
    expect(spy).toHaveBeenCalledWith('gid://shopify/ProductVariant/999');
  });

  it('ignoriert ein Placement aus Line-Item-Properties — das Mapping gewinnt', async () => {
    // Dieser Test behauptete bis 2026-08-12 das Gegenteil: das Cart-Placement
    // gewinnt. Der Pfad ist ersatzlos entfernt, aus demselben Grund wie beim
    // Provider — Properties kommen aus dem BROWSER, und eine frei waehlbare
    // Druckposition waere browser-gesteuerte Produktionseingabe.
    //
    // Die Druckdatei-URL bleibt bewusst eine Property: sie ist in Modell B extern
    // gehostet und gehoert zur Bestellung, nicht zur Variante. Der Unterschied ist
    // nicht "Property gut/boese", sondern ob der Wert die PRODUKTION steuert.
    const o = await normalizeShopifyOrder(
      payload({
        line_items: [
          {
            id: 1, sku: 'SKU-1', quantity: 2, variant_id: 999,
            properties: [
              { name: 'placement', value: 'back' },
              { name: 'printFileUrl', value: 'https://example.com/f.png' },
            ],
          },
        ],
      }),
      opts(),
    );
    expect(o.items[0].metadata.placement).toBe('front_large');
    expect(o.items[0].metadata.printFileUrl).toBe('https://example.com/f.png');
    expect(o.items[0].quantity).toBe(2);
  });

  it('scheitert hart, wenn die Variante kein Placement traegt', async () => {
    const ohnePlacement: VariantResolver = vi.fn(async () => ({
      catalogVariantId: '4025',
      provider: null,
      placement: null,
    }));
    await expect(normalizeShopifyOrder(payload(), opts(ohnePlacement))).rejects.toThrow(
      OrderNotFulfillable,
    );
    // Die Meldung muss auf das PLACEMENT zeigen, nicht auf das Mapping: ein
    // gemeinsamer Text haette bei beiden Ursachen zur falschen Behebung gefuehrt.
    await expect(normalizeShopifyOrder(payload(), opts(ohnePlacement))).rejects.toThrow(
      /provider_placement/,
    );
  });

  it('nimmt den Provider aus dem Varianten-Mapping, nicht aus dem Cart', async () => {
    const withProvider: VariantResolver = vi.fn(async () => ({
      catalogVariantId: '4025',
      provider: 'mock',
      placement: 'front_large',
    }));
    const o = await normalizeShopifyOrder(
      payload({
        line_items: [
          {
            id: 1,
            sku: 'SKU-1',
            quantity: 1,
            variant_id: 999,
            // Der Versuch, den Provider ueber den Cart zu setzen, muss wirkungslos
            // bleiben — sonst waeren Bestellungen an fremde Provider routbar.
            properties: [{ name: 'fulfillmentProvider', value: 'boeser-provider' }],
          },
        ],
      }),
      opts(withProvider),
    );
    expect(o.items[0].metadata.fulfillmentProvider).toBe('mock');
  });

  it('laesst fulfillmentProvider weg, wenn das Mapping keinen nennt (Brand-Default greift)', async () => {
    const o = await normalizeShopifyOrder(payload(), opts());
    expect(o.items[0].metadata.fulfillmentProvider).toBeUndefined();
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
      .fn<VariantResolver>()
      .mockResolvedValueOnce({ catalogVariantId: '4025', provider: null, placement: 'front_large' })
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
