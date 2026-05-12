'use server';

import { subscribeProfileToList } from '@/lib/klaviyo';

export type SubscribeState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribeAction(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const email = String(formData.get('email') ?? '').trim();
  const consent = formData.get('consent') === 'on';

  if (!consent) {
    return { status: 'error', message: 'Bitte bestätigen Sie die Einwilligung.' };
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { status: 'error', message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' };
  }

  const listId = process.env.NEXT_PUBLIC_KLAVIYO_LIST_ID;
  if (!listId) {
    return { status: 'error', message: 'Newsletter-Anmeldung ist derzeit nicht verfügbar.' };
  }

  const result = await subscribeProfileToList({ email, listId });
  if (result.ok) return { status: 'success' };

  switch (result.code) {
    case 'invalid_email':
      return { status: 'error', message: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.' };
    case 'rate_limit':
      return { status: 'error', message: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.' };
    case 'config':
    case 'auth':
    case 'unknown':
    default:
      return { status: 'error', message: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es später erneut.' };
  }
}
