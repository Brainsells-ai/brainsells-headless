const API_VERSION = '2026-01';

export const SHOPIFY_TAGS = {
  products: 'shopify:products',
  collections: 'shopify:collections',
  cart: 'shopify:cart',
  product: (handle: string) => `shopify:product:${handle}`,
  collection: (handle: string) => `shopify:collection:${handle}`,
} as const;

type ShopifyFetchOptions = {
  tags?: string[];
  revalidate?: number;
  cache?: RequestCache;
};

type ShopifyError = { message: string; locations?: unknown; path?: string[] };

export async function shopifyFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  options: ShopifyFetchOptions = {},
): Promise<T> {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN;
  if (!domain) throw new Error('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is not set');
  if (!token) throw new Error('NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN is not set');

  const { tags, revalidate = 3600, cache } = options;

  const response = await fetch(`https://${domain}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
    ...(cache ? { cache } : { next: { revalidate, tags } }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { data?: T; errors?: ShopifyError[] };
  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  if (!json.data) {
    throw new Error('Shopify response had no data');
  }
  return json.data;
}
