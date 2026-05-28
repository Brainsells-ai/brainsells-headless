/* eslint-disable no-console */
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyAdminFetch } from '../lib/shopify-admin';
import { canonicalUrl } from '../lib/seo/canonical-url';

// Idempotent registration of the orders/create webhook against the SILBE
// Shopify app via Admin GraphQL.
//
// Webhooks created via the API are signed with the App Client-Secret
// (SHOPIFY_CLIENT_SECRET) — the same value the route handler uses for HMAC
// verify. That's why this sprint introduced NO new SHOPIFY_WEBHOOK_SECRET
// env-var (cf. Sprint-B spec v2 nachtrag, 2026-05-28).
//
// Callback URL is built via canonical-url.ts so the Phase-11 DNS-switch
// (vercel.app → silbe.at) is a pure env-var change, no code rewrite.
//
// Usage:
//   pnpm tsx scripts/register-webhooks.ts --dry-run
//   pnpm tsx scripts/register-webhooks.ts          # live
//
// Re-run semantics (idempotent):
//   0 existing ORDERS_CREATE → create
//   1 existing, same URL     → no-op
//   1 existing, other URL    → update
//   >1 existing              → fail-loud (manual cleanup in Shopify Admin)

const TOPIC = 'ORDERS_CREATE';
const CALLBACK_PATH = '/api/webhooks/order-created';

const LIST_QUERY = /* GraphQL */ `
  query ListOrderCreatedWebhooks {
    webhookSubscriptions(first: 50, topics: [ORDERS_CREATE]) {
      edges {
        node {
          id
          topic
          endpoint {
            __typename
            ... on WebhookHttpEndpoint { callbackUrl }
          }
        }
      }
    }
  }
`;

const CREATE_MUTATION = /* GraphQL */ `
  mutation CreateOrderCreatedWebhook(
    $topic: WebhookSubscriptionTopic!,
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id }
      userErrors { field message code }
    }
  }
`;

const UPDATE_MUTATION = /* GraphQL */ `
  mutation UpdateOrderCreatedWebhook(
    $id: ID!,
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id }
      userErrors { field message code }
    }
  }
`;

type WebhookEndpoint = {
  __typename: string;
  callbackUrl?: string;
};
type WebhookNode = {
  id: string;
  topic: string;
  endpoint: WebhookEndpoint;
};
type ListResponse = {
  webhookSubscriptions: { edges: { node: WebhookNode }[] };
};
type UserError = { field: string[] | null; message: string; code: string | null };
type CreateResponse = {
  webhookSubscriptionCreate: {
    webhookSubscription: { id: string } | null;
    userErrors: UserError[];
  };
};
type UpdateResponse = {
  webhookSubscriptionUpdate: {
    webhookSubscription: { id: string } | null;
    userErrors: UserError[];
  };
};

function userErrorsToString(errs: UserError[]): string {
  return errs.map((e) => `${e.code ?? 'ERR'}: ${e.message}`).join(', ');
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const callbackUrl = canonicalUrl(CALLBACK_PATH);

  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Topic: ${TOPIC}`);
  console.log(`Callback URL: ${callbackUrl}\n`);

  const list = await shopifyAdminFetch<ListResponse>(LIST_QUERY);
  const existing = list.webhookSubscriptions.edges
    .map((e) => e.node)
    .filter((n) => n.endpoint.__typename === 'WebhookHttpEndpoint');

  console.log(`Existing ${TOPIC} subscriptions: ${existing.length}`);
  for (const n of existing) {
    console.log(`  · ${n.id} → ${n.endpoint.callbackUrl ?? '(unknown endpoint)'}`);
  }
  console.log();

  if (existing.length > 1) {
    console.error(
      `Expected 0 or 1 existing ${TOPIC} subscription, found ${existing.length}. Manual cleanup needed in Shopify Admin before this script can converge.`,
    );
    process.exit(1);
  }

  if (existing.length === 1 && existing[0].endpoint.callbackUrl === callbackUrl) {
    console.log('✓ Already registered with current callback URL — no-op.');
    return;
  }

  if (dryRun) {
    if (existing.length === 0) {
      console.log(`Would CREATE webhook for ${TOPIC} → ${callbackUrl}`);
    } else {
      console.log(`Would UPDATE webhook ${existing[0].id} → ${callbackUrl}`);
    }
    console.log('\nDry-run only. Re-run without --dry-run to apply.');
    return;
  }

  const webhookSubscription = { callbackUrl, format: 'JSON' };

  if (existing.length === 0) {
    const data = await shopifyAdminFetch<CreateResponse>(CREATE_MUTATION, {
      topic: TOPIC,
      webhookSubscription,
    });
    const errs = data.webhookSubscriptionCreate.userErrors;
    if (errs.length > 0) {
      console.error(`✗ Create failed: ${userErrorsToString(errs)}`);
      process.exit(1);
    }
    console.log(
      `✓ Created webhook ${data.webhookSubscriptionCreate.webhookSubscription?.id}`,
    );
    return;
  }

  // length === 1, different URL → update in place
  const data = await shopifyAdminFetch<UpdateResponse>(UPDATE_MUTATION, {
    id: existing[0].id,
    webhookSubscription,
  });
  const errs = data.webhookSubscriptionUpdate.userErrors;
  if (errs.length > 0) {
    console.error(`✗ Update failed: ${userErrorsToString(errs)}`);
    process.exit(1);
  }
  console.log(`✓ Updated webhook ${existing[0].id} → ${callbackUrl}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
