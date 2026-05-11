/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

// Creates the 11 Pflicht-Metafield-Definitions per docs/vocabulary.md §5.3
// in Shopify Admin (namespace: silbe). Idempotent: existing definitions
// are skipped (Shopify returns TAKEN error which is caught).
//
// Usage:
//   pnpm tsx scripts/seed-metafield-definitions.ts --dry-run
//   pnpm tsx scripts/seed-metafield-definitions.ts          # live
//
// Auth: OAuth Client Credentials Grant (Shopify auth migration 2026-01).
// Tokens are minted on demand from SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET
// against POST /admin/oauth/access_token. Tokens are 24h-lifetime; this
// script caches one in-memory and refreshes when < 60s to expiry.
// See: shopify.dev/docs/apps/build/dev-dashboard/get-api-access-tokens

const ADMIN_API_VERSION = '2026-04';

type Definition = {
  name: string;
  key: string;
  type: string;
  description: string;
};

const DEFINITIONS: Definition[] = [
  {
    name: 'Author full name',
    key: 'author_full_name',
    type: 'single_line_text_field',
    description: 'Vollständiger Autorenname (z.B. "Rainer Maria Rilke") — für JSON-LD und PDP-Display.',
  },
  {
    name: 'Author handle',
    key: 'author_handle',
    type: 'single_line_text_field',
    description: 'Slug für Cross-Linking PDP → /stimmen/{handle} (z.B. "rilke").',
  },
  {
    name: 'Work title',
    key: 'work_title',
    type: 'single_line_text_field',
    description: 'Werk-Titel ohne Guillemets (z.B. "Briefe an einen jungen Dichter").',
  },
  {
    name: 'Work year',
    key: 'work_year',
    type: 'number_integer',
    description: 'Erscheinungsjahr des Werks (z.B. 1903).',
  },
  {
    name: 'Quote full',
    key: 'quote_full',
    type: 'multi_line_text_field',
    description: 'Vollständiges Zitat ohne deutsche Anführungszeichen (werden vom Frontend gerendert).',
  },
  {
    name: 'Format',
    key: 'format',
    type: 'single_line_text_field',
    description: 'Format-Bezeichnung (z.B. "A3", "A2", "A1", "Postkarten-3er", "Tote Bag").',
  },
  {
    name: 'Dimensions (cm)',
    key: 'dimensions_cm',
    type: 'single_line_text_field',
    description: 'Maße als String (z.B. "29.7 × 42").',
  },
  {
    name: 'Paper (g/m²)',
    key: 'paper_gsm',
    type: 'number_integer',
    description: 'Papier-Grammatur (typisch 200).',
  },
  {
    name: 'Print location',
    key: 'print_location',
    type: 'single_line_text_field',
    description: 'Druckort-String (z.B. "EU, überwiegend Deutschland").',
  },
  {
    name: 'Editorial essay handle',
    key: 'editorial_essay_handle',
    type: 'single_line_text_field',
    description: 'Slug für Verknüpfung zum Payload-EditorialEssay (z.B. "rilke-habe-geduld").',
  },
  {
    name: 'Themes',
    key: 'themes',
    type: 'json',
    description: 'JSON-Array mit 5–7 thematischen Tags (z.B. ["Sehnsucht", "Wien", "Geduld"]).',
  },
];

const NAMESPACE = 'silbe';

type Env = {
  shop: string;
  clientId: string;
  clientSecret: string;
};

function readEnv(): Env {
  let shop = process.env.SHOPIFY_SHOP;
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const missing: string[] = [];
  if (!shop) missing.push('SHOPIFY_SHOP');
  if (!clientId) missing.push('SHOPIFY_CLIENT_ID');
  if (!clientSecret) missing.push('SHOPIFY_CLIENT_SECRET');
  if (missing.length > 0) {
    console.error(`Missing in .env.local: ${missing.join(', ')}`);
    console.error('See apps/silbe/.env.example for the Shopify Admin OAuth-2026 block.');
    process.exit(1);
  }
  // Tolerate both "z9xkt0-2v" and "z9xkt0-2v.myshopify.com" by stripping the
  // suffix — the OAuth endpoint wants the bare subdomain.
  shop = shop!.replace(/\.myshopify\.com$/, '');
  return { shop, clientId: clientId!, clientSecret: clientSecret! };
}

// Module-level token cache. expiresAt is wall-clock ms.
let tokenCache: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(env: Env): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.accessToken;
  }

  const url = `https://${env.shop}.myshopify.com/admin/oauth/access_token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.clientId,
    client_secret: env.clientSecret,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const text = await response.text();
  let json: { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  try {
    json = JSON.parse(text);
  } catch {
    console.error(`Token exchange failed: HTTP ${response.status} — non-JSON response: ${text}`);
    process.exit(1);
  }

  if (json.error === 'shop_not_permitted') {
    console.error('Token exchange failed: shop_not_permitted.');
    console.error('The Dev Dashboard app and the target Shopify Organization are in DIFFERENT organizations.');
    console.error('Client Credentials Grant does not support cross-org access.');
    console.error('Fix path: switch the seed flow to Authorization Code Grant, or move the app/store into the same org.');
    console.error('Stopping. See `Open Question` in handoff-phase-3.md once written.');
    process.exit(2);
  }

  if (!response.ok || !json.access_token) {
    console.error(`Token exchange failed: HTTP ${response.status}`);
    console.error(`Body: ${text}`);
    if (json.error) console.error(`error: ${json.error}${json.error_description ? ` — ${json.error_description}` : ''}`);
    process.exit(1);
  }

  // Shopify returns expires_in as seconds. Default to 24h if missing.
  const ttlSeconds = typeof json.expires_in === 'number' ? json.expires_in : 86_400;
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: now + ttlSeconds * 1000,
  };
  return tokenCache.accessToken;
}

async function pingAdminApi(env: Env): Promise<void> {
  const token = await getAccessToken(env);
  const url = `https://${env.shop}.myshopify.com/admin/api/${ADMIN_API_VERSION}/shop.json`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
  });

  if (response.status === 401 || response.status === 403) {
    console.error(`Admin API ping failed: ${response.status} ${response.statusText}`);
    console.error('Token exchanged OK but lacks required scopes. App needs read_products + write_products + read_product_listings.');
    console.error('Fix in Shopify Dev Dashboard → [app] → Configuration → Admin API access scopes.');
    process.exit(1);
  }
  if (!response.ok) {
    console.error(`Admin API ping failed: ${response.status} ${await response.text()}`);
    process.exit(1);
  }

  const body = (await response.json()) as { shop?: { name?: string; myshopify_domain?: string } };
  const name = body.shop?.name ?? '<unknown>';
  const myshopifyDomain = body.shop?.myshopify_domain ?? `${env.shop}.myshopify.com`;
  console.log(`✓ Admin API ping OK — shop: "${name}" (${myshopifyDomain})\n`);
}

type AdminGraphqlResponse<T> = {
  data?: T;
  errors?: { message: string }[];
};

type MetafieldDefinitionCreateResult = {
  metafieldDefinitionCreate: {
    createdDefinition: {
      id: string;
      name: string;
      namespace: string;
      key: string;
    } | null;
    userErrors: {
      field: string[] | null;
      message: string;
      code: string | null;
    }[];
  };
};

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
        namespace
        key
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

async function createDefinition(env: Env, def: Definition): Promise<'created' | 'exists' | 'error'> {
  const token = await getAccessToken(env);
  const url = `https://${env.shop}.myshopify.com/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: CREATE_MUTATION,
      variables: {
        definition: {
          name: def.name,
          namespace: NAMESPACE,
          key: def.key,
          description: def.description,
          type: def.type,
          ownerType: 'PRODUCT',
          access: { storefront: 'PUBLIC_READ' },
        },
      },
    }),
  });

  if (!response.ok) {
    console.error(`  ✗ ${def.key} — HTTP ${response.status} ${await response.text()}`);
    return 'error';
  }

  const json = (await response.json()) as AdminGraphqlResponse<MetafieldDefinitionCreateResult>;
  if (json.errors?.length) {
    console.error(`  ✗ ${def.key} — GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`);
    return 'error';
  }

  const userErrors = json.data?.metafieldDefinitionCreate.userErrors ?? [];
  const takenError = userErrors.find((e) => e.code === 'TAKEN');
  if (takenError) {
    console.log(`  · ${def.key} — already exists, skipping`);
    return 'exists';
  }
  if (userErrors.length > 0) {
    console.error(`  ✗ ${def.key} — userErrors: ${userErrors.map((e) => `${e.code ?? 'ERR'}: ${e.message}`).join(', ')}`);
    return 'error';
  }

  const created = json.data?.metafieldDefinitionCreate.createdDefinition;
  console.log(`  ✓ ${def.key} — created (id: ${created?.id ?? '?'})`);
  return 'created';
}

function printDryRun(): void {
  console.log(`Would create ${DEFINITIONS.length} metafield definitions in namespace "${NAMESPACE}", ownerType: PRODUCT, access.storefront: PUBLIC_READ.\n`);
  console.log('Key                       Type                       Name');
  console.log('----                      ----                       ----');
  for (const def of DEFINITIONS) {
    const key = def.key.padEnd(26);
    const type = def.type.padEnd(27);
    console.log(`${key}${type}${def.name}`);
  }
  console.log('\nDescriptions:');
  for (const def of DEFINITIONS) {
    console.log(`  · silbe.${def.key} — ${def.description}`);
  }
  console.log('\nDry-run only. Re-run without --dry-run to apply.');
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const env = readEnv();

  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Target: ${env.shop}.myshopify.com (Admin API ${ADMIN_API_VERSION})\n`);

  // Always: token exchange + ping before any mutation. The ping serves as
  // the auth+scope sanity gate per Phase-3 workflow.
  await pingAdminApi(env);

  if (dryRun) {
    printDryRun();
    return;
  }

  console.log(`Creating ${DEFINITIONS.length} metafield definitions...\n`);
  let created = 0;
  let existed = 0;
  let errored = 0;
  for (const def of DEFINITIONS) {
    const result = await createDefinition(env, def);
    if (result === 'created') created++;
    else if (result === 'exists') existed++;
    else errored++;
  }

  console.log(`\n---\n`);
  console.log(`Created: ${created}    Already-existed: ${existed}    Errored: ${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
