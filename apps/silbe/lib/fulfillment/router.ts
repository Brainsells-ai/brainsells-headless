// Provider selection and order dispatch.
//
// Selection order per line item (MEGAPROMPT §7.3):
//   1. per-item override from the product metafield (highest priority)
//   2. brand default from brand.config
// A provider that is not in the brand allowlist is refused even when a metafield
// names it explicitly — a typo in a metafield must not route real orders to a
// provider this brand never enabled.

import { brandConfig } from '@/lib/brand.config';
import { getProvider } from './registry';
import type {
  FulfillmentProvider,
  FulfillmentResponse,
  NormalizedOrder,
  NormalizedOrderItem,
} from './types';

export function getProviderForItem(item: NormalizedOrderItem): FulfillmentProvider {
  const override = item.metadata.fulfillmentProvider;
  if (override !== undefined && typeof override !== 'string') {
    throw new Error(
      `[fulfillment] metadata.fulfillmentProvider must be a string, got ${typeof override}`,
    );
  }

  const providerName = override ?? brandConfig.fulfillment.defaultProvider;
  const enabled = brandConfig.fulfillment.enabledProviders;

  if (!enabled.includes(providerName)) {
    throw new Error(
      `[fulfillment] provider "${providerName}" is not enabled for this brand. ` +
        `Enabled: ${enabled.join(', ')}`,
    );
  }

  return getProvider(providerName);
}

export interface RoutedResult {
  provider: string;
  outcome: PromiseSettledResult<FulfillmentResponse>;
}

/**
 * Groups items by provider and dispatches one provider order per group.
 *
 * Uses `allSettled` so one failing provider does not hide the outcome of the
 * others — the caller receives every result and decides. Deliberately NOT
 * `all`: swallowing sibling results on the first rejection is how partial
 * fulfillment becomes invisible.
 */
export async function routeOrder(order: NormalizedOrder): Promise<RoutedResult[]> {
  if (order.items.length === 0) {
    throw new Error(`[fulfillment] order ${order.reference} has no items to route`);
  }

  const byProvider = new Map<string, NormalizedOrderItem[]>();
  for (const item of order.items) {
    const provider = getProviderForItem(item);
    const bucket = byProvider.get(provider.name) ?? [];
    bucket.push(item);
    byProvider.set(provider.name, bucket);
  }

  const entries = [...byProvider.entries()];
  const outcomes = await Promise.allSettled(
    entries.map(([name, items]) =>
      getProvider(name).createOrder({ ...order, items }),
    ),
  );

  return entries.map(([provider], i) => ({ provider, outcome: outcomes[i] }));
}
