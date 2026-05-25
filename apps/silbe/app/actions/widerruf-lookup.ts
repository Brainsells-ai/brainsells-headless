'use server';

// Stufe 1 of the § 356a BGB Widerruf flow: look an order up by number + email,
// validate it is still within the 14-day window and not already withdrawn,
// then mint an HMAC token and redirect to the confirm step.
//
// Runtime: this module uses node:crypto transitively (signWiderrufToken). It
// is invoked only from /widerruf, whose page segment pins runtime='nodejs';
// Server Actions inherit the caller's runtime, so no segment config is set (or
// honored) here.

import { lookupOrderByNumberAndEmail } from '@/lib/shopify-order-lookup';
import { signWiderrufToken } from '@/lib/widerruf-token';
import { redirect } from 'next/navigation';

export type WiderrufLookupState =
  | { status: 'idle' }
  | { status: 'error'; message: string };

const ORDER_NUMBER_RE = /^#?\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WIDERRUF_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export async function lookupOrderAction(
  _prev: WiderrufLookupState,
  formData: FormData,
): Promise<WiderrufLookupState> {
  const orderNumber = String(formData.get('orderNumber') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();

  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    return { status: 'error', message: 'Bitte geben Sie eine gültige Bestellnummer ein.' };
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { status: 'error', message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' };
  }

  let order;
  try {
    order = await lookupOrderByNumberAndEmail(orderNumber, email);
  } catch (err) {
    console.error('[widerruf-lookup] order lookup failed:', err);
    return {
      status: 'error',
      message: 'Die Bestellung konnte derzeit nicht geprüft werden. Bitte versuchen Sie es später erneut.',
    };
  }

  // Privacy: identical message whether the order is missing or the email
  // mismatches — never reveal which.
  if (!order) {
    return {
      status: 'error',
      message: 'Bestellung nicht gefunden oder E-Mail-Adresse stimmt nicht überein.',
    };
  }

  if (order.tags.includes('widerrufen')) {
    return { status: 'error', message: 'Dieser Vertrag wurde bereits widerrufen.' };
  }

  const deadlineMs = new Date(order.createdAt).getTime() + WIDERRUF_WINDOW_MS;
  if (Date.now() > deadlineMs) {
    return {
      status: 'error',
      message:
        'Die elektronische Widerrufsfrist ist abgelaufen. Sie können Ihren Widerruf jederzeit per E-Mail an hallo@silbe.at oder per Brief erklären — die gesetzliche Frist von 14 Tagen ab Erhalt bleibt unberührt.',
    };
  }

  const token = signWiderrufToken({
    orderId: order.id,
    email,
    expiresAt: Math.floor(deadlineMs / 1000),
  });

  // redirect() throws NEXT_REDIRECT — must stay outside the try above.
  redirect(`/widerruf/bestaetigen?token=${encodeURIComponent(token)}`);
}
