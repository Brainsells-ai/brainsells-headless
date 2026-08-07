// Provider-agnostic fulfillment webhook endpoint (MEGAPROMPT §7.1).
//
// One route serves every provider; the path segment selects the adapter. The
// route itself contains no provider knowledge beyond that lookup.
//
// NOT wired into SILBE's live fulfillment. SILBE's Gelato and Printful flows run
// on Shopify app level and never reach this endpoint.

import { NextResponse } from 'next/server';
import { getProvider, listProviders } from '@/lib/fulfillment/registry';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider: providerName } = await params;

  let provider;
  try {
    provider = getProvider(providerName);
  } catch {
    // Unknown provider is a 404, not a 500: the caller asked for a route that
    // does not exist. The known list is safe to return — it is not a secret.
    return NextResponse.json(
      { error: 'unknown provider', known: listProviders() },
      { status: 404 },
    );
  }

  // The raw body is required for signature verification — parsing first and
  // re-serialising would change the bytes and break any HMAC.
  const raw = await request.text();

  if (!provider.verifyWebhook(raw, request.headers)) {
    // Deliberately terse: a verification failure must not tell a caller which
    // part of the check failed.
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  try {
    const result = await provider.handleWebhook(payload);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    // Fail loudly with a non-2xx so the provider retries and the failure is
    // visible, rather than returning 200 and dropping the event.
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`[fulfillment/${providerName}] webhook handling failed: ${message}`);
    return NextResponse.json({ error: 'webhook handling failed' }, { status: 500 });
  }
}
