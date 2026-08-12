// Shopify Admin API client.
//
// Auth (per the 2026-01 Shopify auth migration — see .env.example):
// there are no static admin tokens anymore. We mint a short-lived (24h) token
// at runtime via the OAuth Client Credentials Grant against
// `/admin/oauth/access_token`, then send it as `X-Shopify-Access-Token`.
//
// Fail-loud: every helper here throws on error. Callers treat Shopify as the
// source of truth, so a failed mutation must surface, never silently succeed.
//
// Requires Node runtime (callers pin runtime='nodejs').
//
// ---------------------------------------------------------------------------
// STORE-KONTEXT IST PFLICHT — kein impliziter Default
// ---------------------------------------------------------------------------
// Diese Datei ist die EINZIGE Stelle, die Shopify-Credentials aus der Umgebung
// liest. Alle anderen Module bekommen einen `ShopifyStore` übergeben.
//
// Grund: seit es mehr als einen Store gibt (SILBE-Produktion und ein Pool-Dev-
// Store), war `process.env.SHOPIFY_SHOP` ein stiller globaler Default — jedes
// lokal ausgeführte Script hätte PRODUKTION getroffen, auch wenn es für den
// Dev-Store gedacht war. Die schreibenden Pfade (Webhook-Registrierung,
// Metafield-Definitionen, Order-Tags, Purchase-Marker) hätten das ohne Warnung
// getan. "Welcher Store" ist deshalb jetzt eine ANGABE an der Aufrufstelle und
// keine Eigenschaft der Umgebung.
//
// Ein AST-Wächter (lib/fulfillment/guards.test.ts) verbietet direkte
// `process.env.SHOPIFY_*`-Zugriffe ausserhalb dieser Datei.

const ADMIN_API_VERSION = '2026-01';

/** Env-Präfix des Stores, den dieses Deployment bedient. */
export const DEPLOYMENT_STORE_PREFIX = 'SHOPIFY_';

export interface ShopifyStore {
  /** Bare subdomain, z. B. "z9xkt0-2v" — NICHT die .myshopify.com-Domain. */
  readonly shop: string;
  readonly clientId: string;
  readonly clientSecret: string;
  /** Herkunft der Werte. Steht in jeder Fehlermeldung, damit sichtbar ist,
   *  welcher Store gemeint war — die Frage, die im Zweifel zählt. */
  readonly envPrefix: string;
}

/**
 * Baut einen Store-Kontext aus einem Env-Präfix.
 *
 * Das Präfix ist PFLICHTPARAMETER, bewusst ohne Default: ein Default hier wäre
 * exakt der implizite Zustand, den dieser Refactor beseitigt.
 *
 *   storeFromEnv('SHOPIFY_')           → SILBE-Produktion
 *   storeFromEnv('POOL_DEV_SHOPIFY_')  → Pool-Dev-Store
 */
export function storeFromEnv(envPrefix: string): ShopifyStore {
  if (!envPrefix) throw new Error('[shopify-admin] envPrefix ist erforderlich');
  const read = (suffix: string): string => {
    const key = `${envPrefix}${suffix}`;
    const value = process.env[key];
    if (!value) throw new Error(`[shopify-admin] ${key} ist nicht gesetzt`);
    return value;
  };
  return {
    shop: read('SHOP'),
    clientId: read('CLIENT_ID'),
    clientSecret: read('CLIENT_SECRET'),
    envPrefix,
  };
}

/**
 * Der Store, den DIESES Deployment bedient. Für Routen und Runtime-Module.
 *
 * Bewusst eine benannte Funktion statt eines Defaults im Fetch: sie steht an der
 * Aufrufstelle und ist greppbar. Ein Script, das den Pool-Store meint, kann sie
 * nicht versehentlich erwischen — es muss etwas anderes übergeben.
 */
export function deploymentStore(): ShopifyStore {
  return storeFromEnv(DEPLOYMENT_STORE_PREFIX);
}

export function shopDomainOf(store: ShopifyStore): string {
  return `${store.shop}.myshopify.com`;
}

type CachedToken = { token: string; expiresAtMs: number };

// PRO STORE gecacht, nicht global. Vorher war das eine einzelne Modul-Variable —
// mit zwei Stores im selben Prozess hätte der zweite Aufruf den Token des ersten
// wiederverwendet und stillschweigend gegen den falschen Shop gearbeitet.
const tokenCache = new Map<string, CachedToken>();

// Refresh a little before actual expiry to avoid racing the 24h boundary.
const EXPIRY_SKEW_MS = 60_000;

async function mintAdminAccessToken(store: ShopifyStore): Promise<CachedToken> {
  const response = await fetch(`https://${shopDomainOf(store)}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      client_id: store.clientId,
      client_secret: store.clientSecret,
      grant_type: 'client_credentials',
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Shopify admin token mint failed for ${store.shop} (${store.envPrefix}): ` +
        `${response.status} ${await response.text()}`,
    );
  }

  const json = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error(`Shopify admin token mint returned no access_token for ${store.shop}`);
  }

  const ttlMs = (json.expires_in ?? 23 * 3600) * 1000;
  return { token: json.access_token, expiresAtMs: Date.now() + ttlMs };
}

async function getAdminAccessToken(store: ShopifyStore): Promise<string> {
  const key = `${store.envPrefix}${store.shop}`;
  const hit = tokenCache.get(key);
  if (hit && Date.now() < hit.expiresAtMs - EXPIRY_SKEW_MS) return hit.token;

  const fresh = await mintAdminAccessToken(store);
  tokenCache.set(key, fresh);
  return fresh.token;
}

/** Test-Seam: verwirft gecachte Tokens (z. B. nach Env-Wechsel im Test). */
export function resetAdminTokenCache(): void {
  tokenCache.clear();
}

type AdminGraphqlError = { message: string; locations?: unknown; path?: string[] };

/**
 * Executes an Admin GraphQL query/mutation and returns `data`.
 *
 * `store` steht bewusst an ERSTER Stelle: ein vergessener Store-Parameter ist
 * dann ein Typfehler, kein stiller Griff nach Produktion.
 *
 * Throws on transport error, non-2xx, or GraphQL `errors[]`. Shopify's
 * userErrors (mutation-level validation failures) live inside the data payload —
 * callers must inspect those themselves.
 */
export async function shopifyAdminFetch<T>(
  store: ShopifyStore,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const token = await getAdminAccessToken(store);

  const response = await fetch(
    `https://${shopDomainOf(store)}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query, variables }),
      cache: 'no-store',
    },
  );

  if (response.status === 401) {
    tokenCache.delete(`${store.envPrefix}${store.shop}`);
    throw new Error(
      `Shopify Admin API returned 401 for ${store.shop} (${store.envPrefix}) — token rejected`,
    );
  }
  if (!response.ok) {
    throw new Error(
      `Shopify Admin API error for ${store.shop}: ${response.status} ${await response.text()}`,
    );
  }

  const json = (await response.json()) as { data?: T; errors?: AdminGraphqlError[] };
  if (json.errors?.length) {
    throw new Error(`Shopify Admin GraphQL errors (${store.shop}): ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) {
    throw new Error(`Shopify Admin response had no data (${store.shop})`);
  }
  return json.data;
}
