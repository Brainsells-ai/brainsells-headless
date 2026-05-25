// Shopify Admin API client for the § 356a BGB Widerruf flow.
//
// The Widerruf path needs two Admin-only capabilities the Storefront API can't
// provide: looking an order up by name + email, and writing order tags/notes.
//
// Auth (per the 2026-01 Shopify auth migration — see .env.example):
// there are no static admin tokens anymore. We mint a short-lived (24h) token
// at runtime via the OAuth Client Credentials Grant against
// `/admin/oauth/access_token` using SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET,
// then send it as `X-Shopify-Access-Token`. The token is cached at module
// scope so a warm serverless instance mints at most once per ~24h.
//
// Fail-loud: every helper here throws on error. The Widerruf submit path
// treats Shopify as the source of truth, so a failed mutation must surface,
// never silently succeed.
//
// Requires Node runtime (callers pin runtime='nodejs').

const ADMIN_API_VERSION = '2026-01';

type CachedToken = { token: string; expiresAtMs: number };
let cachedToken: CachedToken | null = null;

// Refresh a little before actual expiry to avoid racing the 24h boundary.
const EXPIRY_SKEW_MS = 60_000;

function shopDomain(): string {
  const shop = process.env.SHOPIFY_SHOP;
  if (!shop) throw new Error('SHOPIFY_SHOP is not set');
  // SHOPIFY_SHOP is the bare subdomain (e.g. "z9xkt0-2v"), not the full domain.
  return `${shop}.myshopify.com`;
}

async function mintAdminAccessToken(): Promise<CachedToken> {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId) throw new Error('SHOPIFY_CLIENT_ID is not set');
  if (!clientSecret) throw new Error('SHOPIFY_CLIENT_SECRET is not set');

  const response = await fetch(`https://${shopDomain()}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Shopify admin token mint failed: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error('Shopify admin token mint returned no access_token');
  }

  // expires_in is seconds; default to 23h if absent to stay under the 24h cap.
  const ttlMs = (json.expires_in ?? 23 * 3600) * 1000;
  return { token: json.access_token, expiresAtMs: Date.now() + ttlMs };
}

async function getAdminAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAtMs - EXPIRY_SKEW_MS) {
    return cachedToken.token;
  }
  cachedToken = await mintAdminAccessToken();
  return cachedToken.token;
}

type AdminGraphqlError = { message: string; locations?: unknown; path?: string[] };

/**
 * Executes an Admin GraphQL query/mutation and returns `data`.
 *
 * Throws on transport error, non-2xx, or GraphQL `errors[]`. Note that
 * Shopify's userErrors (mutation-level validation failures) live inside the
 * data payload — callers must inspect those themselves.
 */
export async function shopifyAdminFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = await getAdminAccessToken();

  const response = await fetch(
    `https://${shopDomain()}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    },
  );

  // A 401 can mean the cached token was revoked early — drop it so the next
  // call re-mints rather than looping on a dead token.
  if (response.status === 401) {
    cachedToken = null;
    throw new Error('Shopify Admin API returned 401 (token rejected)');
  }
  if (!response.ok) {
    throw new Error(`Shopify Admin API error: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { data?: T; errors?: AdminGraphqlError[] };
  if (json.errors?.length) {
    throw new Error(`Shopify Admin GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) {
    throw new Error('Shopify Admin response had no data');
  }
  return json.data;
}
