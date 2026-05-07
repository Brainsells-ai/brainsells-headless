import { shopifyFetch } from "@/lib/shopify";

type Product = {
  id: string;
  title: string;
  handle: string;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
};

const PRODUCTS_QUERY = `{
  products(first: 10) {
    edges {
      node {
        id
        title
        handle
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
}`;

export default async function TestPage() {
  try {
    const data = await shopifyFetch<{ products: { edges: { node: Product }[] } }>(PRODUCTS_QUERY);
    const products = data.products.edges;

    return (
      <main style={{ padding: "2rem" }}>
        <h1>Shopify Products</h1>
        <p>Found {products.length} products</p>
        <ul>
          {products.map(({ node }) => (
            <li key={node.id} style={{ marginBottom: "1rem" }}>
              <strong>{node.title}</strong>
              <br />
              Handle: {node.handle}
              <br />
              Price: {node.priceRange.minVariantPrice.amount} {node.priceRange.minVariantPrice.currencyCode}
            </li>
          ))}
        </ul>
      </main>
    );
  } catch (error) {
    return (
      <main style={{ padding: "2rem" }}>
        <h1>Error</h1>
        <pre>{String(error)}</pre>
      </main>
    );
  }
}