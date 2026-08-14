// Legt die Testprodukte für den Fulfillment-Durchstich an.
//
// ZWECK: zwei Produkte mit je einer Variante, die beide Fulfillment-Metafields
// tragen — die erste echte Nutzung der Definitionen aus
// seed-fulfillment-metafield-definitions.ts.
//
// ZWEI DUMMY-BRANDS ÜBER `vendor`. Der Pool-Store trägt später mehrere Marken;
// `vendor` ist das Shopify-eigene Feld dafür und braucht kein Metafield. Zwei
// statt einer, weil erst die zweite belegt, dass die Trennung trägt: ein Feld,
// das nur einen Wert kennt, beweist nichts über Mehrmandantenfähigkeit.
//
// KEIN BESTANDS-TRACKING (tracked: false, inventoryPolicy: CONTINUE). Print-on-
// Demand hat keinen Bestand. Mit Tracking stünde jede Variante sofort auf 0 und
// wäre nicht bestellbar — der Durchstich würde an einer Bestandsprüfung
// scheitern, nicht am Fulfillment, und das wäre ein Fehlschlag aus dem falschen
// Grund.
//
// STATUS DRAFT. Der Store ist ein Dev-Store, es gibt keinen Storefront-Zweck.
// Draft-Orders über die Admin-API funktionieren unabhängig vom Publikationsstatus.
//
// Aufruf:  pnpm tsx scripts/seed-fulfillment-test-products.ts --store=<subdomain> [--dry]

import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { brandConfig } from '@/lib/brand.config';
import {
  VARIANT_MAPPING_KEY,
  VARIANT_PLACEMENT_KEY,
  VARIANT_PROVIDER_KEY,
} from '@/lib/fulfillment/variant-mapping';
import { shopDomainOf, type ShopifyStore } from '@/lib/shopify-admin';
import { requireStoreArg, announceWriteTarget } from './lib/store-arg';

const ADMIN_API_VERSION = process.env.ADMIN_API_VERSION ?? '2026-04';

// Printful-Katalogvariante: Premium Luster Photo Paper Poster (in), A2.
//
// Belegt am 2026-08-12 über die Printful-API, read-only:
//   catalog-variants/19526          → A2 (16.5″×23.3″), Technik digital
//   .../availability                → europe: in stock
//   .../prices?currency=EUR         → 8,85 EUR
//   mockup-generator/printfiles/171 → placement "default", 7016×4961 px @ 300 dpi
//                                     (= 59,4 × 42,0 cm), can_rotate, fill_mode cover
//
// ⚠️ Das Placement heißt "default", NICHT "front_large". front_large ist ein
// DTG-Shirt-Placement; für dieses Produkt gibt es genau ein Placement. Die
// Dispatch-Route hatte 'front_large' als Default fest verdrahtet — entfernt, das
// Placement steht jetzt im Varianten-Metafield (VARIANT_PLACEMENT_KEY).
const CATALOG_VARIANT_ID = '19526';
const PROVIDER = 'printful';
// Poster haben genau EIN druckbares Placement, und es heisst "default" — nicht
// "front_large" (das ist DTG-Shirt). Belegt ueber
// mockup-generator/printfiles/171 → available_placements: {"default": "Print file"}.
const PLACEMENT = 'default';
const SIZE_LABEL = 'A2 (42 × 59,4 cm)';

interface TestProduct {
  vendor: string;
  title: string;
  handle: string;
  sku: string;
  price: string;
}

const PRODUCTS: TestProduct[] = [
  {
    vendor: 'testbrand-a',
    title: 'Testposter A2 (testbrand-a)',
    handle: 'testposter-a2-testbrand-a',
    sku: 'TBA-POSTER-A2',
    price: '29.00',
  },
  {
    vendor: 'testbrand-b',
    title: 'Testposter A2 (testbrand-b)',
    handle: 'testposter-a2-testbrand-b',
    sku: 'TBB-POSTER-A2',
    price: '34.00',
  },
];

// productSet statt productCreate: seit der Trennung von Produkt und Varianten
// legt productCreate eine Default-Variante an, die man anschliessend nachziehen
// muesste — zwei Schreibvorgaenge fuer einen Zustand. productSet beschreibt den
// Zielzustand in einem Call, inklusive Varianten-Metafields.
const LOOKUP = /* GraphQL */ `
  query ProductByHandle($q: String!) {
    products(first: 1, query: $q) {
      nodes {
        id
        handle
      }
    }
  }
`;

const MUTATION = /* GraphQL */ `
  mutation SeedTestProduct($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product {
        id
        title
        handle
        vendor
        status
        variants(first: 5) {
          nodes {
            id
            title
            sku
            price
            inventoryPolicy
            inventoryItem {
              tracked
            }
            metafields(first: 10) {
              nodes {
                namespace
                key
                value
                type
              }
            }
          }
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

function inputFor(p: TestProduct, namespace: string, existingId?: string) {
  return {
    // Mit id ist productSet ein Update, ohne id eine Anlage. Dadurch ist das
    // Script wiederholbar — ein zweiter Lauf ergaenzt fehlende Metafields, statt
    // Duplikate anzulegen.
    ...(existingId ? { id: existingId } : {}),
    title: p.title,
    handle: p.handle,
    vendor: p.vendor,
    status: 'DRAFT',
    productType: 'Poster',
    productOptions: [{ name: 'Format', values: [{ name: SIZE_LABEL }] }],
    variants: [
      {
        optionValues: [{ optionName: 'Format', name: SIZE_LABEL }],
        sku: p.sku,
        price: p.price,
        inventoryPolicy: 'CONTINUE',
        inventoryItem: { tracked: false },
        metafields: [
          {
            namespace,
            key: VARIANT_MAPPING_KEY,
            value: CATALOG_VARIANT_ID,
            type: 'single_line_text_field',
          },
          {
            namespace,
            key: VARIANT_PROVIDER_KEY,
            value: PROVIDER,
            type: 'single_line_text_field',
          },
          {
            namespace,
            key: VARIANT_PLACEMENT_KEY,
            value: PLACEMENT,
            type: 'single_line_text_field',
          },
        ],
      },
    ],
  };
}

async function adminToken(store: ShopifyStore): Promise<string> {
  const res = await fetch(`https://${shopDomainOf(store)}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: store.clientId,
      client_secret: store.clientSecret,
      grant_type: 'client_credentials',
    }),
  });
  if (!res.ok) throw new Error(`Admin-Token-Mint fehlgeschlagen: ${res.status}`);
  const json = (await res.json()) as { access_token?: string; scope?: string };
  if (!json.access_token) throw new Error('Mint lieferte kein access_token');
  if (!json.scope) {
    throw new Error(
      'App-Installation hat KEINE Scope-Grants (scope=""). Scopes ins REQUIRED-Feld, ' +
        'Version releasen, Installation erneut autorisieren.',
    );
  }
  console.log(`Gewaehrte Scopes: ${json.scope}`);
  return json.access_token;
}

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const resolved = requireStoreArg();
  const domain = shopDomainOf(resolved.store);
  const namespace = brandConfig.fulfillment.metafieldNamespace;

  console.log(`Store:      ${domain}`);
  console.log(`Namespace:  ${namespace}`);
  console.log(`Katalog-ID: ${CATALOG_VARIANT_ID} (${PROVIDER}) — Premium Luster A2, placement "default"`);

  if (dry) {
    console.log('\n--dry: nichts geschrieben.');
    console.log(JSON.stringify(PRODUCTS.map((p) => inputFor(p, namespace)), null, 2));
    return;
  }

  announceWriteTarget(resolved);
  const token = await adminToken(resolved.store);

  async function gql<T>(query: string, variables: unknown, label: string): Promise<T> {
    const res = await fetch(`https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors) {
      // Scope-Fehler kommen hier an (ACCESS_DENIED). Bewusst KEIN Ausweichen auf
      // einen anderen Pfad: fehlt write_products fuer Produkte, ist das ein Fund,
      // kein Hindernis.
      throw new Error(`GraphQL errors (${label}): ${JSON.stringify(json.errors)}`);
    }
    if (!json.data) throw new Error(`Keine data-Antwort (${label})`);
    return json.data;
  }

  for (const p of PRODUCTS) {
    const found = await gql<{ products: { nodes: Array<{ id: string; handle: string }> } }>(
      LOOKUP,
      { q: `handle:${p.handle}` },
      `lookup ${p.vendor}`,
    );
    const existing = found.products.nodes.find((n) => n.handle === p.handle);
    console.log(`
  ${p.vendor}: ${existing ? `Update ${existing.id}` : 'Neuanlage'}`);

    const out = await gql<{
      productSet: {
        product: unknown;
        userErrors: { field: string[] | null; message: string; code: string | null }[];
      } | null;
    }>(MUTATION, { input: inputFor(p, namespace, existing?.id) }, p.vendor);

    if (out.productSet?.userErrors?.length) {
      throw new Error(`userErrors (${p.vendor}): ${JSON.stringify(out.productSet.userErrors)}`);
    }
    console.log(JSON.stringify(out.productSet?.product, null, 2));
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
