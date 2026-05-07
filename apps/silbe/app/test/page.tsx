export default async function TestPage() {
  try {
    const response = await fetch(
      "https://z9xkt0-2v.myshopify.com/api/2026-01/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!,
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
        <p>Store domain: z9xkt0-2v.myshopify.com</p>
        <p>Token used: {process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN?.substring(0, 15)}...</p>
        <pre>{text}</pre>
      </main>
    );
  } catch (error) {
    return <pre>{String(error)}</pre>;
  }
}