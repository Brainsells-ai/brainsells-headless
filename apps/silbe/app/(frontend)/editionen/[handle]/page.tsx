import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getProductByHandle, getAllProductHandles } from '@/lib/shopify-queries';
import { getEditorialEssayBySlug } from '@/lib/payload-queries';
import { EDITIONS, isTodo } from '@/scripts/metafields-manifest';
import { JsonLd } from '@/components/seo/JsonLd';
import { productSchema, breadcrumbSchema } from '@/components/seo/schemas';
import { Breadcrumbs } from '@/components/product/Breadcrumbs';
import { Hero } from '@/components/product/Hero';
import { MaterialSpecs } from '@/components/product/MaterialSpecs';
import { EditorialEssay } from '@/components/product/EditorialEssay';
import { ThemeTags } from '@/components/product/ThemeTags';
import { CrossLinks } from '@/components/product/CrossLinks';

export const revalidate = 3600;

// Lock dynamic rendering off — only the 8 handles from generateStaticParams
// (CANONICAL_HANDLES via manifest) get rendered. Any other handle (legacy
// SKUs, bundles, postcards, fake handles) returns a clean 404 from the
// Next router without invoking ProductPage / notFound(). Without this,
// Next 16 defaults to dynamicParams=true and serves the default
// not-found page with status 200, which breaks the negative-test
// contract in tests/e2e/pdp.spec.ts.
export const dynamicParams = false;

export async function generateStaticParams() {
  const handles = await getAllProductHandles();
  return handles.map((handle) => ({ handle }));
}

// Resolve the essay slug from the manifest (canonical SoT) rather than
// from Shopify metafields (which may be empty pre-seed). For canonical
// editions, manifest editorial_essay_handle is always a string; for
// bundles/postcards it's a Todo, but those aren't in CANONICAL_HANDLES.
function essaySlugForHandle(handle: string): string | null {
  const entry = EDITIONS.find((e) => e.handle === handle);
  if (!entry) return null;
  const v = entry.editorial_essay_handle;
  if (typeof v !== 'string') return null;
  if (isTodo(v)) return null;
  return v;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const slug = essaySlugForHandle(handle);

  const [product, essay] = await Promise.all([
    getProductByHandle(handle),
    slug ? getEditorialEssayBySlug(slug) : Promise.resolve(null),
  ]);

  if (!product) notFound();

  return (
    <article>
      <JsonLd
        data={[
          productSchema(product, `/editionen/${handle}`),
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Editionen', path: '/editionen' },
            { name: product.title, path: `/editionen/${handle}` },
          ]),
        ]}
      />
      <Breadcrumbs productTitle={product.title} />
      <Hero product={product} />
      <MaterialSpecs product={product} />
      <EditorialEssay essay={essay} />
      <ThemeTags themes={product.metafields.themes} />
      <Suspense fallback={null}>
        <CrossLinks product={product} />
      </Suspense>
    </article>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  if (!product) return {};

  const description = product.description?.slice(0, 160) ?? '';
  const ogImage = product.images[0]?.url;

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}
