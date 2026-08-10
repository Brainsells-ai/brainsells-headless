// Legt die Metafield-Definition für das Varianten-Mapping an
// (Shopify-Variante → catalog_variant_id des Fulfillment-Providers).
//
// BEWUSST GETRENNT von seed-metafield-definitions.ts. Jenes Script pflegt den
// EDITORIAL-Vertrag auf ownerType PRODUCT (author_handle, work_title, …). Dieses
// hier pflegt einen OPERATIVEN Vertrag auf ownerType PRODUCTVARIANT. Beide in eine
// Datei zu legen hieße, zwei unabhängige Verträge zu koppeln — genau die
// Vermischung, die als Leck #3 aufgeräumt wurde.
//
// 🔴 UNVERIFIZIERT — nie gegen einen Store gelaufen. Zum Zeitpunkt des Schreibens
// existiert kein Nicht-Prod-Store, und SILBE.AT ist produktiv und ausgeschlossen.
// Die Mutations-Form ist aus seed-metafield-definitions.ts übernommen (dort
// verifiziert), der ownerType PRODUCTVARIANT und das Zusammenspiel mit den Scopes
// sind es NICHT. Vor dem ersten Lauf gegen einen Dev-Store prüfen.
//
// Aufruf:  pnpm tsx scripts/seed-fulfillment-metafield-definitions.ts [--dry]

import path from 'node:path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { brandConfig } from '@/lib/brand.config';
import { VARIANT_MAPPING_KEY } from '@/lib/fulfillment/variant-mapping';

const ADMIN_API_VERSION = process.env.ADMIN_API_VERSION ?? '2026-04';

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreateVariantMappingDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id name namespace key ownerType }
      userErrors { field message code }
    }
  }
`;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} ist nicht gesetzt (apps/silbe/.env.local)`);
  return v;
}

async function adminToken(domain: string): Promise<string> {
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: requireEnv('SHOPIFY_CLIENT_ID'),
      client_secret: requireEnv('SHOPIFY_CLIENT_SECRET'),
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
  const shop = requireEnv('SHOPIFY_SHOP');
  const domain = shop.includes('.myshopify.com') ? shop : `${shop}.myshopify.com`;
  const namespace = brandConfig.fulfillment.metafieldNamespace;

  const definition = {
    name: 'Provider catalog variant id',
    namespace,
    key: VARIANT_MAPPING_KEY,
    description:
      'Katalog-Varianten-ID beim Fulfillment-Provider. Wird bei der Produktanlage ' +
      'geschrieben; ohne sie ist die Variante nicht erfüllbar (Hard Fail).',
    type: 'number_integer',
    ownerType: 'PRODUCTVARIANT',
  };

  console.log(`Store:     ${domain}`);
  console.log(`Namespace: ${namespace}`);
  console.log(`Key:       ${VARIANT_MAPPING_KEY}  (ownerType PRODUCTVARIANT)`);

  if (dry) {
    console.log('\n--dry: nichts geschrieben.');
    console.log(JSON.stringify(definition, null, 2));
    return;
  }

  const token = await adminToken(domain);
  const res = await fetch(`https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query: CREATE_MUTATION, variables: { definition } }),
  });
  const json = (await res.json()) as {
    data?: { metafieldDefinitionCreate: { createdDefinition: unknown; userErrors: { message: string; code: string | null }[] } };
    errors?: unknown;
  };

  if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  const out = json.data?.metafieldDefinitionCreate;
  const taken = out?.userErrors?.find((e) => e.code === 'TAKEN');
  if (taken) {
    console.log('\n= existiert bereits — nichts zu tun.');
    return;
  }
  if (out?.userErrors?.length) {
    throw new Error(`userErrors: ${JSON.stringify(out.userErrors)}`);
  }
  console.log('\n✓ angelegt:', JSON.stringify(out?.createdDefinition));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
