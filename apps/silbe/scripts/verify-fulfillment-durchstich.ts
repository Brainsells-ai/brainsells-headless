// Durchstich: Shopify-Order-Payload → normalize → routeOrder → Printful-DRAFT
// → Status prüfen → löschen → Löschung gegenprüfen.
//
// WARUM ALS SCRIPT UND NICHT EINMALIG VON HAND: der Wert liegt in der
// Wiederholbarkeit. Ein einmal ausgeführter Durchstich belegt einen Zeitpunkt;
// ein Script belegt ihn wieder, nachdem sich etwas geändert hat.
//
// DRAFT-ONLY. Es gibt keinen Confirm-Aufruf, weder hier noch im Code — ein
// Struktur-Wächter in guards.test.ts hält das fest. Alles, was hier entsteht,
// wird im finally wieder gelöscht, auch wenn der Lauf scheitert.
//
// Das Feature-Flag wird NUR IM PROZESS gesetzt, nie in einer Datei. Damit ist es
// nach dem Lauf zwangsläufig wieder aus — es war nirgends an.
//
// Aufruf:
//   pnpm tsx scripts/verify-fulfillment-durchstich.ts \
//     --store=<shopify-subdomain> --printful-store=<id> [--keep]

import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

// Der Printful-Store MUSS explizit genannt werden — dasselbe Argument wie bei
// --store: ein Default waere der produktive. 18090343 ist SILBE.AT (shopify-typ,
// produktiv) und wird ohne ausdrueckliche Freigabe verweigert.
const PRINTFUL_PRODUCTION_STORE = '18090343';

const pfArg = process.argv.find((a) => a.startsWith('--printful-store='));
const pfStore = pfArg?.slice('--printful-store='.length).trim();
if (!pfStore) {
  console.error(
    'Kein --printful-store=<id> angegeben.\n\n' +
      '  Es gibt bewusst keinen Default. Bekannt:\n' +
      '    17916545  Brainsells (native)   — Nicht-Produktion\n' +
      `    ${PRINTFUL_PRODUCTION_STORE}  SILBE.AT (shopify)    — PRODUKTIV, nur mit --yes-production\n`,
  );
  process.exit(1);
}
if (pfStore === PRINTFUL_PRODUCTION_STORE && !process.argv.includes('--yes-production')) {
  console.error(`Abbruch: ${pfStore} ist der produktive SILBE.AT-Printful-Store.`);
  process.exit(1);
}

// Nur im Prozess. Diese Zuweisungen ueberleben den Lauf nicht.
process.env.PRINTFUL_STORE_ID = pfStore;
process.env.FULFILLMENT_ENABLED = 'true';
process.env.FULFILLMENT_DEFAULT_PROVIDER = 'printful';
process.env.FULFILLMENT_ENABLED_PROVIDERS = 'printful';

import { normalizeShopifyOrder, OrderNotFulfillable, type ShopifyOrderPayload } from '@/lib/fulfillment/normalize';
import { makeVariantResolver } from '@/lib/fulfillment/variant-mapping';
import { routeOrder } from '@/lib/fulfillment/router';
import { requireStoreArg } from './lib/store-arg';

const API = 'https://api.printful.com';

// FUND (2026-08-12): Printfuls external_id-Eindeutigkeit UEBERLEBT DIE LOESCHUNG.
// Ein geloeschter Draft blockiert seine external_id weiterhin — ein zweiter Lauf
// mit denselben Order-IDs scheitert mit 400 "external_id must be unique per
// store". Deshalb bekommt jeder Lauf eine eigene Kennung.
//
// Das ist nicht nur ein Test-Detail. In Produktion ist external_id die
// Shopify-Order-GID: wenn createOrder durchgeht, die Antwort aber verloren geht,
// liefert Shopify den Webhook erneut zu — und Printful weist die Wiederholung ab.
// Die Route gibt darauf heute 500 zurueck und provoziert die naechste
// Zustellung. Der Konflikt IST die Idempotenz, aber er wird als Fehler behandelt
// statt als "existiert bereits". Eigener Vorgang.
const RUN_ID = process.env.DURCHSTICH_RUN_ID ?? String(Math.floor(Date.now() / 1000));

const VARIANT_A = 58715312455840; // testbrand-a
const VARIANT_B = 58715313209504; // testbrand-b

function pf(pathname: string, init: RequestInit = {}) {
  return fetch(`${API}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.PRINTFUL_API_TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-PF-Store-Id': pfStore!,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

function payload(
  name: string,
  items: Array<{ id: number; sku: string; variant: number }>,
  printFileUrl: string,
): ShopifyOrderPayload {
  return {
    id: `${RUN_ID}-${items[0].id}`,
    admin_graphql_api_id: `gid://shopify/Order/${RUN_ID}-${items[0].id}`,
    name,
    currency: 'EUR',
    total_price: '29.00',
    customer: { first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
    shipping_address: {
      address1: 'Teststrasse 1',
      city: 'Wien',
      zip: '1010',
      country_code: 'AT',
    },
    line_items: items.map((i) => ({
      id: i.id,
      sku: i.sku,
      quantity: 1,
      variant_id: i.variant,
      properties: [{ name: 'printFileUrl', value: printFileUrl }],
    })),
  };
}

const created: string[] = [];

async function runScenario(
  label: string,
  p: ShopifyOrderPayload,
  resolve: ReturnType<typeof makeVariantResolver>,
): Promise<void> {
  console.log(`\n─── ${label} ${'─'.repeat(Math.max(0, 56 - label.length))}`);
  let normalized;
  try {
    normalized = await normalizeShopifyOrder(p, { resolveVariant: resolve });
  } catch (e) {
    const how = e instanceof OrderNotFulfillable ? 'OrderNotFulfillable' : 'Fehler';
    console.log(`  normalize → ${how}: ${e instanceof Error ? e.message : e}`);
    return;
  }
  console.log(`  normalize → ok, ${normalized.items.length} Position(en)`);
  for (const it of normalized.items) {
    console.log(
      `    ${it.sku}: catalogVariantId=${it.metadata.catalogVariantId} ` +
        `placement=${it.metadata.placement} provider=${it.metadata.fulfillmentProvider ?? '(Brand-Default)'}`,
    );
  }

  const results = await routeOrder(normalized);
  for (const r of results) {
    if (r.outcome.status === 'rejected') {
      console.log(`  routeOrder → ${r.provider} ABGELEHNT: ${r.outcome.reason}`);
      continue;
    }
    const value = r.outcome.value as { providerOrderId: string; status: string };
    console.log(`  routeOrder → ${r.provider} angelegt: ${value.providerOrderId} (${value.status})`);
    created.push(value.providerOrderId);

    const statusRes = await pf(`/v2/orders/${value.providerOrderId}`);
    const statusJson = (await statusRes.json()) as { data?: { status?: string; order_items?: unknown[] } };
    console.log(
      `  GET  /v2/orders/${value.providerOrderId} → ${statusRes.status}, ` +
        `status="${statusJson.data?.status}", Positionen=${statusJson.data?.order_items?.length ?? '?'}`,
    );
    if (statusJson.data?.status !== 'draft') {
      console.log(`  ⚠️  ERWARTET WAR "draft" — Status ist "${statusJson.data?.status}".`);
    }
  }
}

async function main(): Promise<void> {
  const { store, isProduction } = requireStoreArg();
  console.log('  ┌─────────────────────────────────────────────');
  console.log(`  │  SHOPIFY:   ${store.shop}.myshopify.com (${isProduction ? 'PRODUKTION' : 'Nicht-Prod'})`);
  console.log(`  │  PRINTFUL:  Store ${pfStore}`);
  console.log('  │  MODUS:     DRAFT-ONLY, Loeschung im finally');
  console.log('  └─────────────────────────────────────────────');

  // Druckdatei. Modell B verlangt eine extern erreichbare URL.
  //
  // FUND (2026-08-12): Printful weist URLs auf dem EIGENEN CDN ab —
  // files.cdn.printful.com/... liefert 400 "file URL is not a valid URL",
  // waehrend dieselbe Anfrage mit einer beliebigen anderen oeffentlichen URL
  // durchgeht. Der naheliegende Gedanke, ein Katalogbild als Testdatei zu nehmen,
  // funktioniert also nicht, und die Fehlermeldung zeigt in die falsche Richtung
  // (die URL ist syntaktisch einwandfrei).
  //
  // Das Seitenverhaeltnis entspricht A2 (1:√2), damit die Datei zum Format passt.
  // Ein Platzhalterbild genuegt: geprueft wird der Weg, nicht das Motiv.
  const printFileUrl = 'https://placehold.co/2000x2828.png';
  console.log(`\n  Druckdatei: ${printFileUrl}`);

  const resolve = makeVariantResolver(store);

  try {
    await runScenario(
      'A: nur testbrand-a',
      payload('#D-A', [{ id: 1, sku: 'TBA-POSTER-A2', variant: VARIANT_A }], printFileUrl),
      resolve,
    );
    await runScenario(
      'B: nur testbrand-b',
      payload('#D-B', [{ id: 2, sku: 'TBB-POSTER-A2', variant: VARIANT_B }], printFileUrl),
      resolve,
    );
    await runScenario(
      'C: GEMISCHT — beide Marken in einem Cart',
      payload(
        '#D-MIX',
        [
          { id: 3, sku: 'TBA-POSTER-A2', variant: VARIANT_A },
          { id: 4, sku: 'TBB-POSTER-A2', variant: VARIANT_B },
        ],
        printFileUrl,
      ),
      resolve,
    );
  } finally {
    if (process.argv.includes('--keep')) {
      console.log(`\n  --keep: ${created.length} Draft(s) bleiben stehen: ${created.join(', ')}`);
      return;
    }
    console.log(`\n─── Loeschung (${created.length} Draft(s)) ${'─'.repeat(30)}`);
    for (const id of created) {
      // DELETE, nicht cancelOrder(). cancelOrder ruft POST /cancel — das ist der
      // Pfad fuer BESTAETIGTE Orders. Ein Draft wird geloescht.
      const del = await pf(`/v2/orders/${id}`, { method: 'DELETE' });
      const after = await pf(`/v2/orders/${id}`);
      const ok = del.status === 204 && after.status === 404;
      console.log(
        `  ${ok ? '✓' : '✗'} ${id}: DELETE → ${del.status}, danach GET → ${after.status}` +
          `${ok ? '' : '   (erwartet 204 → 404)'}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
