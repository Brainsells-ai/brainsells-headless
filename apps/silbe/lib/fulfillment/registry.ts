// Provider registry.
//
// LAZY BY DESIGN, same reason as brand.config.ts: providers are registered as
// FACTORIES, not instances. A provider constructor may read env (Printful needs a
// token and a store id); instantiating at module load would make importing this
// file throw during `next build` and vitest, where those vars are not set. The
// factory is invoked on first `getProvider()` — i.e. at request time, which is
// exactly when a misconfigured brand must fail loudly.

import type { FulfillmentProvider } from './types';
import { MockProvider } from './providers/mock';
import { PrintfulProvider } from './providers/printful';

type ProviderFactory = () => FulfillmentProvider;

const factories: Readonly<Record<string, ProviderFactory>> = {
  mock: () => new MockProvider(),
  printful: () => new PrintfulProvider(),
};

const instances = new Map<string, FulfillmentProvider>();

export function getProvider(name: string): FulfillmentProvider {
  const cached = instances.get(name);
  if (cached) return cached;

  const factory = factories[name];
  if (!factory) {
    throw new Error(
      `[fulfillment] unknown provider "${name}". Known: ${listProviders().join(', ')}`,
    );
  }

  const provider = factory();
  instances.set(name, provider);
  return provider;
}

export function listProviders(): string[] {
  return Object.keys(factories);
}

/** Test seam: drops memoised instances so env changes take effect. */
export function resetProviderCache(): void {
  instances.clear();
}
