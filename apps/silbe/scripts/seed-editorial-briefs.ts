/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyAdminFetch } from '../lib/shopify-admin';

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
// Auth via shopify-admin.ts (OAuth Client Credentials Grant, 2026-01 Shopify
// auth migration). Requires SHOPIFY_SHOP + SHOPIFY_CLIENT_ID +
// SHOPIFY_CLIENT_SECRET in .env.local. The script fails loudly if a handle
// can't be resolved — no silent skip.

const NAMESPACE = 'silbe';
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

const PRODUCT_ID_BY_HANDLE = /* GraphQL */ `
  query ProductIdByHandle($handle: String!) {
    product(handle: $handle) { id }
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

type ProductIdByHandleData = { product: { id: string } | null };

async function getProductGid(handle: string): Promise<string> {
  const data = await shopifyAdminFetch<ProductIdByHandleData>(
    PRODUCT_ID_BY_HANDLE,
    { handle },
  );
  if (!data.product) {
    // Fail-loud: a missing handle means the SKU was renamed/deleted upstream,
    // or the script was run against the wrong shop. Never silently skip.
    throw new Error(
      `Product handle "${handle}" not found in Shopify — refusing to write metafield silently.`,
    );
  }
  return data.product.id;
}

type MetafieldsSetData = {
  metafieldsSet: {
    metafields: { id: string; namespace: string; key: string }[];
    userErrors: { field: string[] | null; message: string; code: string | null }[];
  };
};

async function setEditorialContext(gid: string, value: string): Promise<void> {
  const data = await shopifyAdminFetch<MetafieldsSetData>(METAFIELDS_SET, {
    metafields: [
      {
        ownerId: gid,
        namespace: NAMESPACE,
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

function printDryRun(): void {
  console.log(`Would set ${NAMESPACE}.${KEY} on ${BRIEFS.length} products:\n`);
  for (const brief of BRIEFS) {
    const firstLine = brief.value.slice(0, 90).replace(/\n/g, ' ');
    console.log(`  · ${brief.handle}`);
    console.log(`    "${firstLine}…"\n`);
  }
  console.log('Dry-run only. Re-run without --dry-run to apply.');
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Target: ${NAMESPACE}.${KEY} (${METAFIELD_TYPE})\n`);

  if (dryRun) {
    printDryRun();
    return;
  }

  let ok = 0;
  let errored = 0;
  for (const brief of BRIEFS) {
    try {
      const gid = await getProductGid(brief.handle);
      await setEditorialContext(gid, brief.value);
      console.log(`  ✓ ${brief.handle} (${gid})`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${brief.handle}: ${(err as Error).message}`);
      errored++;
    }
  }

  console.log(`\n---\nOK: ${ok}    Errored: ${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
