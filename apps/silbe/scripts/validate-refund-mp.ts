import { config as loadEnv } from 'dotenv';
import path from 'node:path';
loadEnv({ path: path.resolve(__dirname, '..', '.env.local') });

import { sendGa4MeasurementProtocol } from '../lib/tracking/ga4-mp';

// Validates the refund Measurement-Protocol payload against GA4's DEBUG
// endpoint (/debug/mp/collect) BEFORE anything is pointed at prod. The debug
// endpoint returns validationMessages[]; an empty array means the payload is
// well-formed. The prod endpoint accepts and silently drops malformed events,
// so this is the only pre-flight that catches shape errors.
//
// Requires GA4_MEASUREMENT_ID + GA4_API_SECRET in the environment (set
// interactively / via Vercel — never committed). Sends a synthetic event with
// a throwaway client_id; nothing real is recorded by the debug endpoint.
//
// Usage:
//   pnpm tsx scripts/validate-refund-mp.ts
//   pnpm tsx scripts/validate-refund-mp.ts 6182947382 49.00 EUR

async function main(): Promise<void> {
  const transactionId = process.argv[2] ?? '0000000000';
  const value = Number(process.argv[3] ?? '49.00');
  const currency = process.argv[4] ?? 'EUR';

  console.log(
    `Validating refund event → transaction_id=${transactionId} value=${value} ${currency}`,
  );

  const result = await sendGa4MeasurementProtocol({
    clientId: '1234567890.1700000000',
    debug: true,
    events: [
      {
        name: 'refund',
        params: {
          transaction_id: transactionId,
          value,
          currency,
          session_id: '1700000000',
          engagement_time_msec: 1,
        },
      },
    ],
  });

  console.log(`HTTP status: ${result.status}`);
  const messages = result.validationMessages ?? [];
  if (messages.length === 0) {
    console.log('✓ validationMessages empty — payload is valid.');
    return;
  }
  console.error('✗ validationMessages:');
  for (const m of messages) {
    console.error(`  · ${m.fieldPath ?? '(root)'}: ${m.description ?? ''} [${m.validationCode ?? ''}]`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
