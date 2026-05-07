export default async function TestPage() {
  try {
    const response = await fetch(
      "https://silbe-shop.myshopify.com/api/2026-01/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Shopify-Storefront-Private-Token": process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN!,
        },
        body: JSON.stringify({ query: "{ shop { name } }" }),
        cache: "no-store",
      }
    );

    const text = await response.text();

    return (
      <main style={{ padding: "2rem" }}>
        <h1>Debug</h1>
        <p>Status: {response.status}</p>
        <p>Token used: {process.env.SHOPIFY_STOREFRONT_PRIVATE_TOKEN?.substring(0, 10)}...</p>
        <pre>{text}</pre>
      </main>
    );
  } catch (error) {
    return <pre>{String(error)}</pre>;
  }
}