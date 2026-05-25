// Admin-API order mutations for the § 356a BGB Widerruf flow.
//
// Storage decision (spec D3): the order tag `widerrufen` + an order note with
// the Widerruf-ID and timestamp are the source of truth, visible immediately
// in the Shopify admin and serving as the compliance audit trail.
//
// Both helpers are fail-loud — they throw on transport error, GraphQL error,
// or Shopify userErrors. The submit action awaits these BEFORE firing the
// (fail-soft) Klaviyo confirmation event, so a storage failure aborts the
// whole submit rather than confirming a Widerruf we never recorded.
//
// Needs the `write_orders` scope. Requires Node runtime (callers pin nodejs).

import { shopifyAdminFetch } from '@/lib/shopify-admin';

type UserError = { field: string[] | null; message: string };

const TAGS_ADD_MUTATION = /* GraphQL */ `
  mutation WiderrufTagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      userErrors { field message }
    }
  }
`;

const ORDER_NOTE_QUERY = /* GraphQL */ `
  query WiderrufOrderNote($id: ID!) {
    order(id: $id) { note }
  }
`;

const ORDER_NOTE_MUTATION = /* GraphQL */ `
  mutation WiderrufOrderNoteUpdate($id: ID!, $note: String!) {
    orderUpdate(input: { id: $id, note: $note }) {
      order { id }
      userErrors { field message }
    }
  }
`;

function throwOnUserErrors(context: string, errors: UserError[] | undefined): void {
  if (errors && errors.length > 0) {
    throw new Error(`Shopify ${context} userErrors: ${JSON.stringify(errors)}`);
  }
}

/**
 * Adds the `widerrufen` tag to an order. Additive (tagsAdd) so it never
 * clobbers tags set between lookup and submit. Idempotent — re-tagging an
 * already-tagged order is a no-op on Shopify's side.
 */
export async function tagOrderWiderrufen(orderId: string): Promise<void> {
  const data = await shopifyAdminFetch<{ tagsAdd: { userErrors: UserError[] } }>(
    TAGS_ADD_MUTATION,
    { id: orderId, tags: ['widerrufen'] },
  );
  throwOnUserErrors('tagsAdd', data.tagsAdd.userErrors);
}

/**
 * Appends a block to the order note, preserving any existing note. Shopify has
 * no note-append primitive, so this reads the current note then writes the
 * concatenation.
 */
export async function appendOrderNote(orderId: string, block: string): Promise<void> {
  const current = await shopifyAdminFetch<{ order: { note: string | null } | null }>(
    ORDER_NOTE_QUERY,
    { id: orderId },
  );
  const existing = current.order?.note?.trim() ?? '';
  const note = existing ? `${existing}\n\n${block}` : block;

  const data = await shopifyAdminFetch<{
    orderUpdate: { order: { id: string } | null; userErrors: UserError[] };
  }>(ORDER_NOTE_MUTATION, { id: orderId, note });
  throwOnUserErrors('orderUpdate', data.orderUpdate.userErrors);
}
