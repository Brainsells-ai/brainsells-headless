import { getPayload } from './getPayload';

// Canonical Payload read layer for PDP + future editorial surfaces.
// Mirror to lib/shopify-queries.ts — both layers consumed by Server
// Components via Promise.all in the PDP route.
//
// KNOWN ISSUE (Node 25.x): `pnpm payload:generate-types` fails under
// Node 25's stricter CJS↔ESM interop (same upstream bug as the Phase
// 1.5b `scripts/seed-pages.ts` blocker). Until the upstream fix lands
// OR we run generate-types under Node 22 LTS, `payload-types.ts` is
// not produced and we cannot `import type { EditorialEssay } from
// '../payload-types'`. The minimal type below mirrors
// collections/EditorialEssays.ts schema — keep in sync until the
// generated file is available. See docs/polish-list.md.

export type EditorialEssay = {
  id: number | string;
  title: string;
  slug: string;
  intro?: string | null;
  // body is Lexical SerializedEditorState. Kept as `unknown` here
  // (lexical isn't a direct dep — transitive of @payloadcms/richtext-lexical)
  // so the queries layer doesn't peek inside. The PDP EditorialEssay
  // component renders via @payloadcms/richtext-lexical/react's RichText
  // which carries its own typed prop interface.
  body?: unknown;
  pullQuote?: {
    text?: string | null;
    source?: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

// Fetch one EditorialEssay by slug. The slug matches the
// silbe.editorial_essay_handle metafield on the Shopify product (1:N —
// one essay can serve multiple SKUs, e.g. Hero + Goldrahmen variants).
// Returns null when no essay exists for the slug, which is the
// expected pre-seed state before Aleks fills the editorial-essays
// collection. PDP renders an inline placeholder in that case (not 404).
export async function getEditorialEssayBySlug(slug: string): Promise<EditorialEssay | null> {
  const payload = await getPayload();
  const result = await payload.find({
    collection: 'editorial-essays',
    where: { slug: { equals: slug } },
    limit: 1,
  });
  return (result.docs[0] as EditorialEssay | undefined) ?? null;
}
