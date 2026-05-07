const SHOPIFY_DOMAIN = "z9xkt0-2v.myshopify.com";
const API_VERSION = "2026-01";

export async function shopifyFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(
    `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${await response.text()}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data as T;
}