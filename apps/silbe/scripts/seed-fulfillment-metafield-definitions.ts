// Legt die Metafield-Definition für das Varianten-Mapping an
// (Shopify-Variante → catalog_variant_id des Fulfillment-Providers).
//
// BEWUSST GETRENNT von seed-metafield-definitions.ts. Jenes Script pflegt den
// EDITORIAL-Vertrag auf ownerType PRODUCT (author_handle, work_title, …). Dieses
// hier pflegt einen OPERATIVEN Vertrag auf ownerType PRODUCTVARIANT. Beide in eine
// Datei zu legen hieße, zwei unabhängige Verträge zu koppeln — genau die
// Vermischung, die als Leck #3 aufgeräumt wurde.
//
// ✅ VERIFIZIERT am 2026-08-12 gegen brainsells-pod-pool-dev. Bestätigt: ownerType
// PRODUCTVARIANT wird akzeptiert, und write_products genügt für Definitionen —
// eine eigene Metafield-Berechtigung braucht es nicht. Beide Definitionen
// angelegt, anschließend durch echte Produkte und den Resolver gegengeprüft.
//
// Aufruf:  pnpm tsx scripts/seed-fulfillment-metafield-definitions.ts [--dry]

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

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreateVariantMappingDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id name namespace key ownerType }
      userErrors { field message code }
    }
  }
`;

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
  // Gap #10 lässt grüßen: ein leeres scope-Feld heißt, die App darf nichts.
  if (!json.scope) {
    throw new Error(
      'App-Installation hat KEINE Scope-Grants (scope=""). Scopes ins REQUIRED-Feld, ' +
        'Version releasen, Installation erneut autorisieren.',
    );
  }
  return json.access_token;
}

async function main(): Promise<void> {
  const dry = process.argv.includes('--dry');
  const resolved = requireStoreArg();
  const domain = shopDomainOf(resolved.store);
  const namespace = brandConfig.fulfillment.metafieldNamespace;

  // ZWEI Definitionen, beide ownerType PRODUCTVARIANT im Namespace aus brand.config.
  //
  // Zum Typ: bewusst single_line_text_field, NICHT number_integer. Printfuls
  // catalog_variant_id ist heute numerisch, aber der Key ist provider-agnostisch
  // benannt und ein anderer POD-Anbieter kann alphanumerisch zaehlen. Die ID wird
  // nie berechnet, nur uebergeben und verglichen. number_integer kauft nur eine
  // Schreib-Validierung, die wir ohnehin im Code haben — und die gehoert
  // provider-spezifisch an die Provider-Grenze, nicht in die agnostische Schicht.
  // Ein Typwechsel spaeter kostet Definition-loeschen-und-neu-schreiben.
  const definitions = [
    {
      name: 'Provider catalog variant id',
      namespace,
      key: VARIANT_MAPPING_KEY,
      description:
        'Katalog-Varianten-ID beim Fulfillment-Provider (opak, nicht zwingend numerisch). ' +
        'Wird bei der Produktanlage geschrieben; ohne sie ist die Variante nicht erfuellbar (Hard Fail).',
      type: 'single_line_text_field',
      ownerType: 'PRODUCTVARIANT',
    },
    {
      name: 'Fulfillment provider',
      namespace,
      key: VARIANT_PROVIDER_KEY,
      description:
        'Welcher Provider diese Variante erfuellt ("printful", "mock", …). Traegt die ' +
        'Variante selbst, statt es aus dem Store zu schliessen — ein Store kann gemischt sein.',
      type: 'single_line_text_field',
      ownerType: 'PRODUCTVARIANT',
    },
    {
      name: 'Provider placement',
      namespace,
      key: VARIANT_PLACEMENT_KEY,
      description:
        'Druckposition beim Provider ("default" fuer Poster, "front_large" fuer DTG-Shirts). ' +
        'Traegt die Variante, weil der Katalog nur sagt, welche Placements MOEGLICH sind — ' +
        'nicht, auf welches dieses Produkt druckt. Ohne sie ist die Variante nicht erfuellbar.',
      type: 'single_line_text_field',
      ownerType: 'PRODUCTVARIANT',
    },
  ];

  console.log(`Store:     ${domain}`);
  console.log(`Namespace: ${namespace}`);
  for (const d of definitions) {
    console.log(`Key:       ${d.key}  (${d.type}, ownerType ${d.ownerType})`);
  }

  if (dry) {
    console.log('\n--dry: nichts geschrieben.');
    console.log(JSON.stringify(definitions, null, 2));
    return;
  }

  announceWriteTarget(resolved);
  const token = await adminToken(resolved.store);

  for (const definition of definitions) {
    const res = await fetch(`https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query: CREATE_MUTATION, variables: { definition } }),
    });
    const json = (await res.json()) as {
      data?: {
        metafieldDefinitionCreate: {
          createdDefinition: unknown;
          userErrors: { message: string; code: string | null }[];
        };
      };
      errors?: unknown;
    };

    if (json.errors) {
      throw new Error(`GraphQL errors (${definition.key}): ${JSON.stringify(json.errors)}`);
    }
    const out = json.data?.metafieldDefinitionCreate;
    if (out?.userErrors?.find((e) => e.code === 'TAKEN')) {
      console.log(`  = ${definition.key}: existiert bereits — nichts zu tun.`);
      continue;
    }
    if (out?.userErrors?.length) {
      throw new Error(`userErrors (${definition.key}): ${JSON.stringify(out.userErrors)}`);
    }
    console.log(`  ✓ ${definition.key}: angelegt — ${JSON.stringify(out?.createdDefinition)}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
