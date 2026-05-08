/* eslint-disable no-console */

// KNOWN ISSUE (Node 25.x): importing from 'payload' transitively pulls in
// `payload/dist/exports/node.js → bin/loadEnv.js`, which destructures from a
// default-import of `@next/env`. Under Node 25's stricter CJS↔ESM interop the
// default is undefined → "Cannot destructure 'loadEnvConfig' of undefined".
// Workarounds, in order of preference:
//   1. Run the seed against a Node 22 LTS shell.
//   2. Wait for Payload to ship an interop fix (tracked upstream).
//   3. Create the entry via the admin UI at /admin/collections/pages/create.
// When the upstream fix lands, this script runs as-is.

import 'dotenv/config';
import { getPayload } from 'payload';
import config from '../payload.config';

// Idempotent seed for the homepage editorial letter. Re-runs are safe — the
// script upserts on the slug. Phase 2 will read this Page via the Payload
// Local API on the homepage server component.
async function main() {
  const payload = await getPayload({ config });

  const SLUG = 'editorial-letter-homepage';
  const TITLE = 'Editorial Letter — Homepage';
  const BODY =
    'Warum fünf Stimmen — und nicht fünfzig. Diese Seite wird in der Werkstatt redigiert. ' +
    'In Phase 2 ersetzen wir den Plain-Text-Body durch einen Lexical-Editor mit ' +
    'Pull-Quotes und Source-Captions.';

  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: SLUG } },
    limit: 1,
  });

  if (existing.docs[0]) {
    await payload.update({
      collection: 'pages',
      id: existing.docs[0].id,
      data: { title: TITLE, body: BODY },
    });
    console.log(`[seed] updated existing page "${SLUG}" (id=${existing.docs[0].id})`);
  } else {
    const created = await payload.create({
      collection: 'pages',
      data: { slug: SLUG, title: TITLE, body: BODY },
    });
    console.log(`[seed] created page "${SLUG}" (id=${created.id})`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
