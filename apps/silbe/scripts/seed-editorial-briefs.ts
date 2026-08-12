/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyAdminFetch, type ShopifyStore } from '../lib/shopify-admin';
import { requireStoreArg, announceWriteTarget } from './lib/store-arg';
import { brandConfig } from '@/lib/brand.config';

// Ziel-Store. Wird in main() aus --store aufgeloest; ein Zugriff davor wirft.
// Bewusst kein Default: ein Default waere der Produktions-Store.
let TARGET: ShopifyStore | null = null;
function store(): ShopifyStore {
  if (!TARGET) throw new Error('[store] Ziel-Store nicht gesetzt — requireStoreArg() fehlt in main()');
  return TARGET;
}


// Populates `silbe.editorial_context` for the 3 MVP edition products. The text
// is the editorial brief that Klaviyo Flow 1 ("Bestellung Editorial") renders
// into the order-confirmation mail as `{{ event.editorial_context }}`.
//
// Idempotent: metafieldsSet is upsert — setting the same value is a no-op,
// re-runs are safe.
//
// Usage:
//   pnpm tsx scripts/seed-editorial-briefs.ts --dry-run
//   pnpm tsx scripts/seed-editorial-briefs.ts          # live
//
// Dry-run still hits the Admin API for handle resolution (read-only) and only
// skips the metafieldsSet write — so handle-lookup bugs surface before the
// live run.
//
// Auth via shopify-admin.ts (OAuth Client Credentials Grant, 2026-01 Shopify
// auth migration). Requires SHOPIFY_SHOP + SHOPIFY_CLIENT_ID +
// SHOPIFY_CLIENT_SECRET in .env.local. The script fails loudly if a handle
// can't be resolved — no silent skip.

// Lazy: dotenv populates process.env at the top of this script, but reading
// brand.config into a module constant still couples the value to import order.
// A call keeps the read at the point of use.
const namespace = (): string => brandConfig.editorial.namespace;
const KEY = 'editorial_context';
const METAFIELD_TYPE = 'multi_line_text_field';

type Brief = { handle: string; value: string };

// Brief texts are editorial prose owned by Merlin (2026-05-28). They describe
// the paper as "hochweißes Naturpapier ... matt und säurefrei" — a deliberate
// editorial-prose register that diverges from the canonical byte-identical
// material-spec string "Hochweißes Premium-Papier, 200 g/m², matt, säurefrei".
// Approved deviation per Plan-vor-Build #1 review.
const BRIEFS: Brief[] = [
  {
    handle: 'silbe-rilke-habegeduld',
    value: `Aus den Briefen an einen jungen Dichter, geschrieben 1903 in Worpswede an Franz Xaver Kappus — die wohl meistzitierte Stelle des Briefwechsels und zugleich die geduldigste. Rilke antwortet einem jungen Mann, der Antworten erwartet, mit der Bitte, die Fragen zu bewohnen, anstatt sie zu lösen.
Für SILBE ist dieser Satz Ausgangspunkt einer eigenen editorischen Praxis: ein Zitat nicht als Dekor, sondern als Gegenüber. Gedruckt auf hochweißem Naturpapier, 200 g/m², matt und säurefrei, im Format A3. Wir fertigen jedes Exemplar erst nach Bestellung — in Europa, ohne Lagerhaltung, ohne Eile. Die Edition ist Teil unseres ersten Bogens deutschsprachiger Stimmen, kuratiert in Wien.`,
  },
  {
    handle: 'silbe-kafka-axt',
    value: `Aus einem Brief Franz Kafkas an Oskar Pollak, datiert 27. Jänner 1904 — zwei Jahre vor Die Verwandlung, fünf vor Der Process. Kafka, damals zwanzig, schreibt seinem Schulfreund über das, was Lektüre eigentlich leisten müsse: erschüttern, nicht trösten. Der Satz ist keine Theorie, er ist eine Bitte an die eigene Lesepraxis.
Für SILBE steht dieses Zitat für eine Haltung gegenüber Literatur, die wir teilen: Bücher als Werkzeuge, nicht als Möbel. Gedruckt auf hochweißem Naturpapier, 200 g/m², matt und säurefrei, im Format A3. Wir fertigen jedes Exemplar erst nach Bestellung — in Europa, ohne Lagerhaltung. Die Edition ist Teil unseres ersten Bogens deutschsprachiger Stimmen, kuratiert in Wien.`,
  },
  {
    handle: 'silbe-zweig-dir-der-du',
    value: `Die erste Zeile aus Stefan Zweigs Brief einer Unbekannten, erschienen 1922 bei Insel — eine der dichtesten Erzählungen der österreichischen Moderne. Eine Frau schreibt einem Mann, der sie nie wahrgenommen hat, einen Brief, den er nie beantworten wird. Die Anrede ist die ganze Geschichte.
Für SILBE ist dieser Satz eine Übung in editorischer Zurückhaltung: ein Anfang, der nichts erklärt, und der genau deshalb trägt. Gedruckt auf hochweißem Naturpapier, 200 g/m², matt und säurefrei, im Format A3. Wir fertigen jedes Exemplar erst nach Bestellung — in Europa, ohne Lagerhaltung. Die Edition ist Teil unseres ersten Bogens deutschsprachiger Stimmen, kuratiert in Wien.`,
  },
];

// ─── GraphQL ──────────────────────────────────────────────────────────────

// Admin API 2026-04 does NOT accept product(handle: ...) — handle lookup on the
// `product` field is Storefront-API only. Admin-side, the canonical pattern is
// products(first: 1, query: "handle:...").
const PRODUCT_ID_BY_HANDLE = /* GraphQL */ `
  query ProductIdByHandle($query: String!) {
    products(first: 1, query: $query) {
      edges { node { id } }
    }
  }
`;

const METAFIELDS_SET = /* GraphQL */ `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id namespace key }
      userErrors { field message code }
    }
  }
`;

type ProductIdByHandleData = {
  products: { edges: { node: { id: string } }[] };
};

async function getProductGid(handle: string): Promise<string> {
  const data = await shopifyAdminFetch<ProductIdByHandleData>(store(), PRODUCT_ID_BY_HANDLE,
    { query: `handle:${handle}` },
  );
  const node = data.products.edges[0]?.node;
  if (!node) {
    // Fail-loud: a missing handle means the SKU was renamed/deleted upstream,
    // or the script was run against the wrong shop. Never silently skip.
    throw new Error(
      `Product handle "${handle}" not found in Shopify — refusing to write metafield silently.`,
    );
  }
  return node.id;
}

type MetafieldsSetData = {
  metafieldsSet: {
    metafields: { id: string; namespace: string; key: string }[];
    userErrors: { field: string[] | null; message: string; code: string | null }[];
  };
};

async function setEditorialContext(gid: string, value: string): Promise<void> {
  const data = await shopifyAdminFetch<MetafieldsSetData>(store(), METAFIELDS_SET, {
    metafields: [
      {
        ownerId: gid,
        namespace: namespace(),
        key: KEY,
        type: METAFIELD_TYPE,
        value,
      },
    ],
  });
  const userErrors = data.metafieldsSet.userErrors;
  if (userErrors.length > 0) {
    throw new Error(
      `metafieldsSet userErrors: ${userErrors
        .map((e) => `${e.code ?? 'ERR'}: ${e.message}`)
        .join(', ')}`,
    );
  }
}

async function main(): Promise<void> {
  const resolved = requireStoreArg();
  TARGET = resolved.store;
  announceWriteTarget(resolved);

  const dryRun = process.argv.includes('--dry-run');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Target: ${namespace()}.${KEY} (${METAFIELD_TYPE})\n`);

  if (dryRun) {
    console.log(
      `Resolving ${BRIEFS.length} handles via Admin API (read-only) — metafieldsSet writes are skipped.\n`,
    );
  }

  let ok = 0;
  let errored = 0;
  for (const brief of BRIEFS) {
    try {
      // Handle-lookup runs in BOTH modes — that's the point of the dry-run
      // extension: catch query-shape bugs (e.g. the 2026-05-28 product(handle:)
      // regression) before they hit the live run.
      const gid = await getProductGid(brief.handle);
      if (dryRun) {
        const firstLine = brief.value.slice(0, 90).replace(/\n/g, ' ');
        console.log(`  · ${brief.handle} → ${gid}`);
        console.log(`    "${firstLine}…"\n`);
      } else {
        await setEditorialContext(gid, brief.value);
        console.log(`  ✓ ${brief.handle} (${gid})`);
      }
      ok++;
    } catch (err) {
      console.error(`  ✗ ${brief.handle}: ${(err as Error).message}`);
      errored++;
    }
  }

  console.log(`\n---\nOK: ${ok}    Errored: ${errored}`);
  if (dryRun) {
    console.log('\nDry-run only. Re-run without --dry-run to apply.');
  }
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
