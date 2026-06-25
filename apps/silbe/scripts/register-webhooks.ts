import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { shopifyAdminFetch } from '../lib/shopify-admin';
import { canonicalUrl } from '../lib/seo/canonical-url';

// Idempotent registration of the SILBE app's Shopify webhooks via Admin
// GraphQL. Each subscription in SUBSCRIPTIONS is reconciled independently.
//
// Webhooks created via the API are signed with the App Client-Secret
// (SHOPIFY_CLIENT_SECRET) — the same value the route handlers use for HMAC
// verify. That's why no separate SHOPIFY_WEBHOOK_SECRET env-var exists
// (cf. Sprint-B spec v2 nachtrag, 2026-05-28).
//
// Callback URLs are built via canonical-url.ts so the Phase-11 DNS-switch
// (vercel.app → silbe.at) is a pure env-var change, no code rewrite.
//
// Usage:
//   pnpm tsx scripts/register-webhooks.ts --dry-run
//   pnpm tsx scripts/register-webhooks.ts          # live
//
// Re-run semantics (idempotent, per topic):
//   0 existing → create
//   1 existing, same URL → no-op
//   1 existing, other URL → update
//   >1 existing → fail-loud (manual cleanup in Shopify Admin)

type WebhookTopic = 'ORDERS_CREATE' | 'REFUNDS_CREATE';

type Subscription = { topic: WebhookTopic; path: string };

const SUBSCRIPTIONS: Subscription[] = [
  { topic: 'ORDERS_CREATE', path: '/api/webhooks/order-created' },
  // refunds/create → server-side GA4 `refund` event (full refunds only).
  { topic: 'REFUNDS_CREATE', path: '/api/webhooks/refunds-create' },
];

const LIST_QUERY = /* GraphQL */ `
  query ListWebhooks($topics: [WebhookSubscriptionTopic!]) {
    webhookSubscriptions(first: 50, topics: $topics) {
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
  mutation CreateWebhook(
    $topic: WebhookSubscriptionTopic!,
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id }
      userErrors { field message }
    }
  }
`;

const UPDATE_MUTATION = /* GraphQL */ `
  mutation UpdateWebhook(
    $id: ID!,
    $webhookSubscription: WebhookSubscriptionInput!
  ) {
    webhookSubscriptionUpdate(id: $id, webhookSubscription: $webhookSubscription) {
      webhookSubscription { id }
      userErrors { field message }
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
// Note: webhookSubscriptionCreate/Update return the generic UserError type,
// which exposes only `field` and `message` — no `code`.
type UserError = { field: string[] | null; message: string };
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
  return errs
    .map((e) => `${e.field?.join('.') ?? 'ERR'}: ${e.message}`)
    .join(', ');
}

// Returns true on success, false on a fail-loud condition the caller should
// turn into a non-zero exit.
async function reconcile(sub: Subscription, dryRun: boolean): Promise<boolean> {
  const callbackUrl = canonicalUrl(sub.path);
  console.log(`\n── ${sub.topic} → ${callbackUrl}`);

  const list = await shopifyAdminFetch<ListResponse>(LIST_QUERY, {
    topics: [sub.topic],
  });
  const existing = list.webhookSubscriptions.edges
    .map((e) => e.node)
    .filter((n) => n.endpoint.__typename === 'WebhookHttpEndpoint');

  console.log(`   existing: ${existing.length}`);
  for (const n of existing) {
    console.log(`     · ${n.id} → ${n.endpoint.callbackUrl ?? '(unknown endpoint)'}`);
  }

  if (existing.length > 1) {
    console.error(
      `   ✗ Expected 0 or 1 existing ${sub.topic}, found ${existing.length}. Manual cleanup needed in Shopify Admin.`,
    );
    return false;
  }

  if (existing.length === 1 && existing[0].endpoint.callbackUrl === callbackUrl) {
    console.log('   ✓ Already registered with current callback URL — no-op.');
    return true;
  }

  if (dryRun) {
    if (existing.length === 0) {
      console.log(`   would CREATE → ${callbackUrl}`);
    } else {
      console.log(`   would UPDATE ${existing[0].id} → ${callbackUrl}`);
    }
    return true;
  }

  const webhookSubscription = { callbackUrl, format: 'JSON' };

  if (existing.length === 0) {
    const data = await shopifyAdminFetch<CreateResponse>(CREATE_MUTATION, {
      topic: sub.topic,
      webhookSubscription,
    });
    const errs = data.webhookSubscriptionCreate.userErrors;
    if (errs.length > 0) {
      console.error(`   ✗ Create failed: ${userErrorsToString(errs)}`);
      return false;
    }
    console.log(`   ✓ Created ${data.webhookSubscriptionCreate.webhookSubscription?.id}`);
    return true;
  }

  // length === 1, different URL → update in place
  const data = await shopifyAdminFetch<UpdateResponse>(UPDATE_MUTATION, {
    id: existing[0].id,
    webhookSubscription,
  });
  const errs = data.webhookSubscriptionUpdate.userErrors;
  if (errs.length > 0) {
    console.error(`   ✗ Update failed: ${userErrorsToString(errs)}`);
    return false;
  }
  console.log(`   ✓ Updated ${existing[0].id} → ${callbackUrl}`);
  return true;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`Mode: ${dryRun ? 'DRY-RUN' : 'LIVE'}`);

  let ok = true;
  for (const sub of SUBSCRIPTIONS) {
    // Sequential so the log stays readable and a fail-loud topic is obvious.
    const result = await reconcile(sub, dryRun);
    ok = ok && result;
  }

  if (!ok) {
    console.error('\nOne or more subscriptions failed to converge.');
    process.exit(1);
  }
  if (dryRun) console.log('\nDry-run only. Re-run without --dry-run to apply.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
