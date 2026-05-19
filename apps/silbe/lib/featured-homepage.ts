// R8 Homepage Featured Editions — Single Source of Truth.
// Drei Karten in fester Reihenfolge: Rilke → Kafka → Zweig.
// Image-Mapping by handle (nicht hart in JSX verdrahtet).
// Titel/Preis/PDP-Route kommen LIVE aus Shopify Storefront (siehe
// getHomepageFeaturedEditions in lib/shopify-queries.ts), das image-Feld
// hier überschreibt nur die Karten-Visuals mit dem lokalen R8-Composite.

export type FeaturedHandle =
  | 'silbe-rilke-geduld-goldrahmen'
  | 'silbe-kafka-axt-goldrahmen'
  | 'silbe-zweig-unbekannte-goldrahmen';

export type FeaturedEntry = {
  handle: FeaturedHandle;
  image: string;
  alt: string;
};

export const HOMEPAGE_FEATURED: readonly FeaturedEntry[] = [
  {
    handle: 'silbe-rilke-geduld-goldrahmen',
    image: '/images/sku-02-rilke-habegeduld.jpg',
    alt: 'SILBE Rilke-Edition „Habe Geduld“ — gerahmt in einem Wiener Schreibzimmer',
  },
  {
    handle: 'silbe-kafka-axt-goldrahmen',
    image: '/images/sku-06-kafka-axt.jpg',
    alt: 'SILBE Kafka-Edition „Ein Buch muss die Axt sein“ — gerahmt in einem dunklen Salon',
  },
  {
    handle: 'silbe-zweig-unbekannte-goldrahmen',
    image: '/images/sku-01-zweig-dir.jpg',
    alt: 'SILBE Zweig-Edition „Dir, der Du mich nie gekannt“ — gerahmt im Wiener Café',
  },
] as const;

export const HOMEPAGE_FEATURED_HANDLES = HOMEPAGE_FEATURED.map((e) => e.handle);
