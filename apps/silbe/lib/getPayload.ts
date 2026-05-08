import { getPayload as initPayload } from 'payload';
import config from '@payload-config';

// Cached singleton — avoids re-initialising Payload on every Server Component
// render in dev. Production Next builds reuse the module-level cache too.
let cached: Awaited<ReturnType<typeof initPayload>> | null = null;

export async function getPayload() {
  if (!cached) {
    cached = await initPayload({ config });
  }
  return cached;
}
