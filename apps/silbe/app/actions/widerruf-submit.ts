'use server';

// Stufe 2 of the § 356a BGB Widerruf flow: verify the HMAC token, then record
// the Widerruf as Shopify tag + note (source of truth, fail-loud) and fire the
// Klaviyo confirmation event (fail-soft). The Widerruf is legally received on
// the customer's click (§ 356a Abs. 5 BGB), not on mail dispatch — so Shopify
// success, not Klaviyo success, is what gates the success redirect.
//
// Runtime: uses node:crypto transitively (verifyWiderrufToken + randomBytes).
// Invoked only from /widerruf/bestaetigen, whose page segment pins
// runtime='nodejs'; Server Actions inherit that.

import { randomBytes } from 'node:crypto';
import { verifyWiderrufToken } from '@/lib/widerruf-token';
import { tagOrderWiderrufen, appendOrderNote } from '@/lib/shopify-order-mutate';
import { trackKlaviyoEvent } from '@/lib/klaviyo-events';
import { redirect } from 'next/navigation';

export type WiderrufSubmitState =
  | { status: 'idle' }
  | { status: 'error'; message: string };

const MAX_REASON_LEN = 500;

function makeWiderrufId(): string {
  return `WR-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export async function submitWiderrufAction(
  _prev: WiderrufSubmitState,
  formData: FormData,
): Promise<WiderrufSubmitState> {
  const token = String(formData.get('token') ?? '');
  const reasonRaw = String(formData.get('reason') ?? '').trim();
  const reason = reasonRaw.slice(0, MAX_REASON_LEN);

  const payload = verifyWiderrufToken(token);
  if (!payload) {
    return { status: 'error', message: 'Ungültiger oder abgelaufener Widerruf-Link.' };
  }

  const widerrufId = makeWiderrufId();
  const timestamp = new Date().toISOString();

  const note =
    `[WIDERRUF ${widerrufId}] Eingegangen ${timestamp}\n` +
    `Kunde: ${payload.email}\n` +
    `Grund: ${reason || 'keine Angabe'}\n` +
    `Juristisch zugegangen gem. § 356a Abs. 5 BGB`;

  // 1. Shopify = source of truth, fail-loud. A failure here aborts the submit
  //    so we never confirm a Widerruf we did not record.
  try {
    await tagOrderWiderrufen(payload.orderId);
    await appendOrderNote(payload.orderId, note);
  } catch (err) {
    console.error('[widerruf-submit] Shopify mutation failed:', err);
    return {
      status: 'error',
      message: 'Ihr Widerruf konnte derzeit nicht verarbeitet werden. Bitte versuchen Sie es später erneut.',
    };
  }

  // 2. Klaviyo = fail-soft. Triggers the confirmation mail; a failure is logged
  //    inside the helper and must not block the legally-effective Widerruf.
  await trackKlaviyoEvent('Widerruf Eingegangen', payload.email, {
    widerruf_id: widerrufId,
    order_id: payload.orderId,
    timestamp,
    reason: reason || null,
  });

  // redirect() throws NEXT_REDIRECT — must stay outside the try above.
  redirect(`/widerruf/erfolg?id=${encodeURIComponent(widerrufId)}`);
}
