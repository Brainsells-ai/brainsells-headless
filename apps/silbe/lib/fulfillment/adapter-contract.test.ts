// ONE contract suite, run against EVERY provider.
//
// This file is the actual evidence that the abstraction holds. A claim in a PR
// description that "the interface is provider-agnostic" is not evidence; two
// independent implementations passing identical assertions is.
//
// Contract rules asserted here, in plain words:
//   1. `name` is a stable non-empty identifier.
//   2. `verifyWebhook` FAILS CLOSED — no signature, no secret, empty body → false.
//   3. `createOrder` refuses an empty order.
//   4. `createOrder` refuses an item without a print-file URL (Model B).
//   5. `cancelOrder` / `getStatus` reject an unknown provider order id.
//   6. `handleWebhook` refuses a payload that is not an object.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockProvider } from './providers/mock';
import { PrintfulProvider } from './providers/printful';
import type { FulfillmentProvider, NormalizedOrder } from './types';
import { normalizeShopifyOrder } from './normalize';

function orderWith(items: NormalizedOrder['items']): NormalizedOrder {
  return {
    id: 'gid://shopify/Order/1',
    reference: '#1042',
    brand: 'testbrand-a',
    customer: { email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace' },
    shippingAddress: {
      line1: 'Teststraße 1',
      city: 'Wien',
      postalCode: '1010',
      country: 'AT',
    },
    items,
    currency: 'EUR',
    totalAmount: 32,
  };
}

const itemWithoutPrintFile: NormalizedOrder['items'][number] = {
  sku: 'SKU-1',
  productHandle: 'handle-1',
  quantity: 1,
  metadata: { catalogVariantId: 4025, placement: 'front_large' },
};

/** Providers under contract. Adding a provider means adding one line here. */
const SUBJECTS: Array<{ name: string; make: () => FulfillmentProvider }> = [
  { name: 'MockProvider', make: () => new MockProvider() },
  { name: 'PrintfulProvider', make: () => new PrintfulProvider() },
];

describe.each(SUBJECTS)('FulfillmentProvider contract — $name', ({ make }) => {
  beforeEach(() => {
    // Printful reads credentials lazily; the contract must not depend on the
    // network, so fetch is stubbed to fail loudly if a test ever reaches it.
    vi.stubEnv('PRINTFUL_API_TOKEN', 'test-token-not-a-real-secret');
    vi.stubEnv('PRINTFUL_STORE_ID', '18090343');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network call not expected in the contract suite');
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('exposes a stable non-empty name', () => {
    const provider = make();
    expect(typeof provider.name).toBe('string');
    expect(provider.name.length).toBeGreaterThan(0);
    expect(provider.name).toBe(make().name);
  });

  it('verifyWebhook fails closed without a signature', () => {
    const provider = make();
    expect(provider.verifyWebhook('{"a":1}', new Headers())).toBe(false);
  });

  it('verifyWebhook fails closed on an empty payload', () => {
    const provider = make();
    const headers = new Headers({
      'x-mock-signature': MockProvider.WEBHOOK_SECRET,
      'x-printful-signature': 'deadbeef',
    });
    expect(provider.verifyWebhook('', headers)).toBe(false);
  });

  it('createOrder refuses an order without items', async () => {
    const provider = make();
    await expect(provider.createOrder(orderWith([]))).rejects.toThrow();
  });

  it('createOrder refuses an item without a print-file URL', async () => {
    const provider = make();
    await expect(provider.createOrder(orderWith([itemWithoutPrintFile]))).rejects.toThrow();
  });

  it('cancelOrder rejects an unknown provider order id', async () => {
    const provider = make();
    await expect(provider.cancelOrder('does-not-exist')).rejects.toThrow();
  });

  it('getStatus rejects an unknown provider order id', async () => {
    const provider = make();
    await expect(provider.getStatus('does-not-exist')).rejects.toThrow();
  });

  it('handleWebhook refuses a non-object payload', async () => {
    const provider = make();
    await expect(provider.handleWebhook('not-an-object')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Provider-specific behaviour that is NOT part of the shared contract.
// ---------------------------------------------------------------------------

describe('MockProvider specifics', () => {
  it('accepts its own signature and completes a full lifecycle', async () => {
    const provider = new MockProvider();
    const created = await provider.createOrder(
      orderWith([
        {
          ...itemWithoutPrintFile,
          metadata: { ...itemWithoutPrintFile.metadata, printFileUrl: 'https://example.com/f.png' },
        },
      ]),
    );
    expect(created.status).toBe('created');

    const headers = new Headers({ 'x-mock-signature': MockProvider.WEBHOOK_SECRET });
    expect(provider.verifyWebhook('{"a":1}', headers)).toBe(true);

    const result = await provider.handleWebhook({
      providerOrderId: created.providerOrderId,
      newStatus: 'shipped',
    });
    expect(result.newStatus).toBe('shipped');
    expect(result.shouldNotifyCustomer).toBe(true);

    const status = await provider.getStatus(created.providerOrderId);
    expect(status.status).toBe('shipped');

    await expect(provider.cancelOrder(created.providerOrderId)).rejects.toThrow(/shipped/);
  });
});

describe('PrintfulProvider specifics', () => {
  beforeEach(() => {
    vi.stubEnv('PRINTFUL_API_TOKEN', 'test-token-not-a-real-secret');
    vi.stubEnv('PRINTFUL_STORE_ID', '18090343');
  });
  afterEach(() => vi.unstubAllEnvs());

  // EHRLICHKEITS-KORREKTUR: Dieser Test hiess "rejects a product id passed where a
  // catalog VARIANT id is required" und uebergab '71' als String — er war gruen,
  // weil der TYP nicht passte (string statt number), nicht weil ein Produkt-ID
  // erkannt worden waere. Seit die ID bewusst ein opaker String ist, faellt diese
  // zufaellige Absicherung weg, und der Test prueft, was tatsaechlich pruefbar ist.
  //
  // Nicht pruefbar bleibt: Produkt-ID vs. Varianten-ID. Beide sind positive
  // Ganzzahlen; kein Code kann sie unterscheiden. Dagegen schuetzen nur die
  // Benennung (catalogVariantId) und Printfuls eigene Fehlermeldung beim Anlegen.
  it.each([
    ['leerer String', ''],
    ['nicht numerisch', 'abc'],
    ['null-Wert', '0'],
    ['negativ', '-5'],
    ['Dezimalzahl', '40.25'],
  ])('weist eine unbrauchbare catalogVariantId zurueck (%s)', async (_label, value) => {
    const provider = new PrintfulProvider();
    await expect(
      provider.createOrder(
        orderWith([
          {
            sku: 'SKU-1',
            productHandle: 'h',
            quantity: 1,
            metadata: {
              catalogVariantId: value,
              placement: 'front_large',
              printFileUrl: 'https://example.com/f.png',
            },
          },
        ]),
      ),
    ).rejects.toThrow(/catalogVariantId/);
  });

  it('verifyWebhook stays closed while PRINTFUL_WEBHOOK_SECRET is unset', () => {
    vi.stubEnv('PRINTFUL_WEBHOOK_SECRET', '');
    const provider = new PrintfulProvider();
    const headers = new Headers({ 'x-printful-signature': 'anything' });
    expect(provider.verifyWebhook('{"a":1}', headers)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalize.ts gegen BEIDE Provider.
//
// Der Zweck ist nicht, normalize noch einmal zu testen — das tut normalize.test.ts.
// Der Zweck ist die Nahtstelle: was normalizeShopifyOrder ausgibt, muss von jedem
// Provider ohne Sonderbehandlung angenommen werden. Bricht das, ist entweder die
// Normalisierung provider-spezifisch geworden oder ein Provider verlangt etwas
// Eigenes — beides würde die Abstraktion aushöhlen, ohne dass ein bestehender
// Test rot wird.
// ---------------------------------------------------------------------------

describe.each(SUBJECTS)('normalize → $name', ({ make }) => {
  beforeEach(() => {
    vi.stubEnv('PRINTFUL_API_TOKEN', 'test-token-not-a-real-secret');
    vi.stubEnv('PRINTFUL_STORE_ID', '17916545');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('akzeptiert eine normalisierte Order ohne provider-spezifische Anpassung', async () => {
    const normalized = await normalizeShopifyOrder(
      {
        id: 501,
        admin_graphql_api_id: 'gid://shopify/Order/501',
        name: '#501',
        currency: 'EUR',
        total_price: '32.00',
        customer: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
        shipping_address: { address1: 'Teststraße 1', city: 'Wien', zip: '1010', country_code: 'AT' },
        line_items: [
          {
            id: 1,
            sku: 'SKU-1',
            quantity: 1,
            variant_id: 999,
            properties: [{ name: 'printFileUrl', value: 'https://example.com/f.png' }],
          },
        ],
      },
      { resolveVariant: async () => ({ catalogVariantId: '4025', provider: null, placement: 'front_large', brand: 'testbrand-a' }) },
    );

    // Printful geht über das Netz — Antwort stubben, damit die Nahtstelle und nicht
    // die Konnektivität geprüft wird.
    //
    // PFADABHÄNGIG, seit createOrder die Technik aus dem Katalog holt statt sie mit
    // 'dtg' zu defaulten. Ein Stub, der auf jeden Pfad dieselbe Order-Antwort gibt,
    // würde die neuen Katalog-Calls verschlucken und den Test grün lassen, ohne dass
    // die Technik je geprüft wäre — genau die Sorte grün, die nichts behauptet.
    // Die Antworten spiegeln echte Formen (Variante 4025 → Produkt 71, dtg).
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/v2/catalog-variants/')) {
          return json({ data: { catalog_product_id: 71, placement_dimensions: [] } });
        }
        if (url.includes('/v2/catalog-products/')) {
          return json({
            data: { placements: [{ placement: 'front_large', technique: 'dtg' }] },
          });
        }
        return json({ data: { id: 170000001, status: 'draft' } });
      }),
    );

    const res = await make().createOrder(normalized);
    expect(res.providerOrderId).toBeTruthy();
    expect(['created', 'queued']).toContain(res.status);
  });

  it('Technik kommt aus dem Katalog, nicht aus einem Default', async () => {
    // Der Verhaltenstest, der die Textgegenprobe in guards.test.ts ersetzt.
    // Ein Textmuster war dort zweimal gruen, obwohl der Katalog-Call fehlte.
    // Hier kann das nicht passieren: der Katalog sagt "digital" (Poster), und
    // wenn der alte `?? 'dtg'`-Pfad zurueckkehrt, steht 'dtg' im Order-Body.
    const normalized = await normalizeShopifyOrder(
      {
        id: 124,
        admin_graphql_api_id: 'gid://shopify/Order/124',
        name: '#1043',
        currency: 'EUR',
        total_price: '29.00',
        customer: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
        shipping_address: { address1: 'Teststrasse 1', city: 'Wien', zip: '1010', country_code: 'AT' },
        line_items: [
          {
            id: 1,
            sku: 'TBB-POSTER-A2',
            quantity: 1,
            variant_id: 999,
            properties: [{ name: 'printFileUrl', value: 'https://example.com/poster.png' }],
          },
        ],
      },
      {
        resolveVariant: async () => ({
          catalogVariantId: '19526',
          provider: null,
          placement: 'default',
          brand: 'testbrand-b',
        }),
      },
    );

    const calls: Array<{ url: string; body?: string }> = [];
    const json = (b: unknown) =>
      new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: typeof init?.body === 'string' ? init.body : undefined });
        if (url.includes('/v2/catalog-variants/')) {
          return json({ data: { catalog_product_id: 171, placement_dimensions: [] } });
        }
        if (url.includes('/v2/catalog-products/')) {
          return json({ data: { placements: [{ placement: 'default', technique: 'digital' }] } });
        }
        return json({ data: { id: 170000002, status: 'draft' } });
      }),
    );

    await new PrintfulProvider().createOrder(normalized);

    const orderCall = calls.find((c) => c.url.includes('/v2/orders') && c.body);
    expect(orderCall, 'kein POST auf /v2/orders').toBeTruthy();
    const sent = JSON.parse(orderCall!.body!);
    expect(sent.order_items[0].placements[0].technique).toBe('digital');
    expect(JSON.stringify(sent)).not.toContain('dtg');
  });
});
