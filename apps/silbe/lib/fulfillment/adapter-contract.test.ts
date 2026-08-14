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
import { PrintfulProvider, printfulExternalId } from './providers/printful';
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

describe('PrintfulProvider — external_id-Idempotenz', () => {
  // Printfuls external_id ist eindeutig pro Store und die Eindeutigkeit UEBERLEBT
  // DIE LOESCHUNG (live verifiziert 2026-08-12). external_id ist die
  // Shopify-Order-GID; geht createOrder durch und die Antwort verloren, liefert
  // Shopify erneut zu. Ohne Idempotenz antwortet die Route 500, Shopify liefert
  // wieder, und der Fehler kann NIE aufhoeren — die Order existiert ja.
  // Eine REALISTISCHE Shopify-Order-GID: 13-stellige Id, zusammen 33 Zeichen —
  // ueber Printfuls Grenze von 32. Genau die Laenge, die die frueheren Proben mit
  // kuenstlich kurzen Ids verfehlt haben.
  const EXT = 'gid://shopify/Order/5678901234567';

  function order(): NormalizedOrder {
    return {
      id: EXT,
      reference: '#555',
      brand: 'testbrand-a',
      customer: { email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace' },
      shippingAddress: { line1: 'Teststrasse 1', city: 'Wien', postalCode: '1010', country: 'AT' },
      items: [
        {
          sku: 'TBA-POSTER-A2',
          productHandle: 'h',
          quantity: 1,
          metadata: {
            catalogVariantId: '19526',
            placement: 'default',
            printFileUrl: 'https://example.com/f.png',
          },
        },
      ],
      currency: 'EUR',
      totalAmount: 29,
    };
  }

  /** Printful-Doppel mit EINEM Zustand: welche external_ids sind vergeben. */
  function stubPrintful() {
    const vergeben = new Map<string, { id: number; status: string; email: string }>();
    let nextId = 170000001;
    const posts: unknown[] = [];
    const json = (b: unknown, status = 200) =>
      new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/v2/catalog-variants/')) {
          return json({ data: { catalog_product_id: 171, placement_dimensions: [] } });
        }
        if (url.includes('/v2/catalog-products/')) {
          return json({ data: { placements: [{ placement: 'default', technique: 'digital' }] } });
        }
        // Lookup per @external_id
        const at = url.match(/\/v2\/orders\/@(.+)$/);
        if (at && init?.method === undefined) {
          const hit = vergeben.get(decodeURIComponent(at[1]));
          return hit
            ? json({
                data: {
                  id: hit.id,
                  status: hit.status,
                  external_id: decodeURIComponent(at[1]),
                  recipient: { email: hit.email },
                },
              })
            : json({ error: { message: 'not found' } }, 404);
        }
        if (url.endsWith('/v2/orders') && init?.method === 'POST') {
          const body = JSON.parse(init.body as string);
          posts.push(body);
          const ext = body.external_id as string;
          if (vergeben.has(ext)) {
            // Wortlaut aus der echten API, damit die Erkennung an dem haengt,
            // was Printful tatsaechlich sendet.
            return json(
              {
                error: {
                  reason: 'BadRequest',
                  message:
                    'External ID validation error. external_id must be unique per store, ' +
                    `${ext} is already used by store 17916545`,
                },
              },
              400,
            );
          }
          const id = nextId++;
          vergeben.set(ext, { id, status: 'draft', email: body.recipient.email });
          return json({ data: { id, status: 'draft' } });
        }
        throw new Error(`unerwarteter Aufruf: ${init?.method ?? 'GET'} ${url}`);
      }),
    );
    return { vergeben, posts };
  }

  beforeEach(() => {
    vi.stubEnv('PRINTFUL_API_TOKEN', 'test-token-not-a-real-secret');
    vi.stubEnv('PRINTFUL_STORE_ID', '17916545');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('zweiter identischer Aufruf liefert dieselbe Order-ID, ohne eine zweite anzulegen', async () => {
    const { vergeben } = stubPrintful();
    const provider = new PrintfulProvider();

    const first = await provider.createOrder(order());
    const second = await provider.createOrder(order());

    expect(second.providerOrderId).toBe(first.providerOrderId);
    expect(second.status).toBe('created');
    expect(vergeben.size, 'es darf genau EINE Order geben').toBe(1);
  });

  it('meldet den Konflikt als Erfolg — kein Throw', async () => {
    stubPrintful();
    const provider = new PrintfulProvider();
    await provider.createOrder(order());
    await expect(provider.createOrder(order())).resolves.toBeTruthy();
  });

  it('kennzeichnet die zweite Antwort als idempotent', async () => {
    stubPrintful();
    const provider = new PrintfulProvider();
    await provider.createOrder(order());
    const second = await provider.createOrder(order());
    expect((second.raw as { idempotent?: boolean }).idempotent).toBe(true);
  });

  it('WIRFT, wenn die external_id vergeben ist, aber keine Order auffindbar', async () => {
    // Der widerspruechliche Zustand — u.a. nach einer geloeschten Order, denn
    // Printful gibt die external_id NICHT frei. Blind Erfolg zu melden waere hier
    // der teuerste Fehler: eine Order gaelte als angelegt, die es nicht gibt.
    //
    // Der Stub liefert deshalb GENAU diese Kombination: POST -> Konflikt,
    // Lookup -> 404. Ein erster Anlauf delegierte das POST an einen anderen Stub
    // und legte die Order dabei wirklich an — dann kam gar kein Konflikt und der
    // Test war rot aus dem falschen Grund.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/v2/catalog-variants/')) {
          return new Response(JSON.stringify({ data: { catalog_product_id: 171 } }), { status: 200 });
        }
        if (url.includes('/v2/catalog-products/')) {
          return new Response(
            JSON.stringify({ data: { placements: [{ placement: 'default', technique: 'digital' }] } }),
            { status: 200 },
          );
        }
        if (url.includes('/v2/orders/@')) {
          return new Response(JSON.stringify({ error: { message: 'not found' } }), { status: 404 });
        }
        if (init?.method === 'POST') {
          return new Response(
            JSON.stringify({
              error: {
                message:
                  'External ID validation error. external_id must be unique per store, ' +
                  `${printfulExternalId(EXT)} is already used by store 17916545`,
              },
            }),
            { status: 400 },
          );
        }
        throw new Error(`unerwartet: ${url}`);
      }),
    );
    await expect(new PrintfulProvider().createOrder(order())).rejects.toThrow(/widerspruechlich/);
  });

  it('macht aus einer Shopify-GID eine external_id unter 32 Zeichen', () => {
    expect(EXT.length).toBeGreaterThan(32);
    const ext = printfulExternalId(EXT);
    expect(ext).toBe('5678901234567');
    expect(ext.length).toBeLessThanOrEqual(32);
  });

  it('ist deterministisch — Wiederholung ergibt dieselbe external_id', () => {
    // Ohne das greift die Idempotenz nicht: eine zufaellige oder zeitabhaengige
    // Id waere bei jeder Zustellung eine andere und legte jedes Mal neu an.
    expect(printfulExternalId(EXT)).toBe(printfulExternalId(EXT));
  });

  it('KUERZT eine zu lange Nicht-GID nicht, sondern wirft', () => {
    // Kuerzen koennte zwei Orders auf dieselbe Id abbilden — die zweite gaelte
    // dann als bereits angelegt und wuerde nie produziert. Eine bezahlte
    // Bestellung, die still verschwindet, ist das Schlimmste hier.
    expect(() => printfulExternalId('x'.repeat(33))).toThrow(/33 Zeichen/);
  });

  it('WIRFT, wenn die gefundene Order einen anderen Empfaenger hat', async () => {
    // Die Kollision, die im Pool-Modell moeglich waere: zwei Shopify-Stores
    // teilen sich einen Printful-Store, Order-Ids sind nur pro Shop eindeutig.
    // Ohne diese Pruefung gaelte eine fremde Order als "unsere existiert schon"
    // und die eigene wuerde NIE produziert — ein stiller Nicht-Druck.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes('/v2/catalog-variants/')) {
          return new Response(JSON.stringify({ data: { catalog_product_id: 171 } }), { status: 200 });
        }
        if (url.includes('/v2/catalog-products/')) {
          return new Response(
            JSON.stringify({ data: { placements: [{ placement: 'default', technique: 'digital' }] } }),
            { status: 200 },
          );
        }
        if (url.includes('/v2/orders/@')) {
          return new Response(
            JSON.stringify({
              data: { id: 170000042, status: 'draft', recipient: { email: 'jemand.anderes@example.com' } },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            error: {
              message:
                'External ID validation error. external_id must be unique per store, ' +
                `${printfulExternalId(EXT)} is already used by store 17916545`,
            },
          }),
          { status: 400 },
        );
      }),
    );
    await expect(new PrintfulProvider().createOrder(order())).rejects.toThrow(/anderem Empfaenger/);
  });

  it('weist einen ANDEREN 400er nicht als Erfolg durch', async () => {
    // Gegenprobe zur Konflikt-Erkennung: sie ist bewusst eng. Eine weiche Pruefung
    // wuerde echte Validierungsfehler als "existiert schon" durchwinken.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/v2/catalog-variants/')) {
          return new Response(JSON.stringify({ data: { catalog_product_id: 171 } }), { status: 200 });
        }
        if (url.includes('/v2/catalog-products/')) {
          return new Response(
            JSON.stringify({ data: { placements: [{ placement: 'default', technique: 'digital' }] } }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ error: { message: 'Invalid recipient: zip is required' } }),
          { status: 400 },
        );
      }),
    );
    await expect(new PrintfulProvider().createOrder(order())).rejects.toThrow(/zip is required/);
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
