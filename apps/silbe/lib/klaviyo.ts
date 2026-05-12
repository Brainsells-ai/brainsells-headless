// Klaviyo server-only client for newsletter subscription.
//
// Double-Opt-In is configured per-list in the Klaviyo dashboard
// (Lists & Segments → <list> → Settings → Opt-in Process = Double opt-in).
// This client does not toggle DOI per request — it just enqueues a
// subscription job; Klaviyo decides whether to send a confirmation
// e-mail based on the list config.
//
// Endpoint: POST /api/profile-subscription-bulk-create-jobs/
// Docs: https://developers.klaviyo.com/en/reference/subscribe_profiles

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const KLAVIYO_REVISION = '2024-10-15';

export type KlaviyoSubscribeResult =
  | { ok: true }
  | { ok: false; code: 'invalid_email' | 'auth' | 'rate_limit' | 'config' | 'unknown'; status: number };

export async function subscribeProfileToList(args: {
  email: string;
  listId: string;
  source?: string;
}): Promise<KlaviyoSubscribeResult> {
  const privateKey = process.env.KLAVIYO_PRIVATE_KEY;
  if (!privateKey) return { ok: false, code: 'config', status: 0 };
  if (!args.listId) return { ok: false, code: 'config', status: 0 };

  const body = {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes: {
        custom_source: args.source ?? 'silbe.at footer',
        profiles: {
          data: [
            {
              type: 'profile',
              attributes: {
                email: args.email,
                subscriptions: {
                  email: { marketing: { consent: 'SUBSCRIBED' } },
                },
              },
            },
          ],
        },
      },
      relationships: {
        list: { data: { type: 'list', id: args.listId } },
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(`${KLAVIYO_API_BASE}/profile-subscription-bulk-create-jobs/`, {
      method: 'POST',
      headers: {
        Authorization: `Klaviyo-API-Key ${privateKey}`,
        revision: KLAVIYO_REVISION,
        accept: 'application/vnd.api+json',
        'content-type': 'application/vnd.api+json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    return { ok: false, code: 'unknown', status: 0 };
  }

  if (response.status === 202) return { ok: true };
  if (response.status === 400) return { ok: false, code: 'invalid_email', status: 400 };
  if (response.status === 401 || response.status === 403) {
    return { ok: false, code: 'auth', status: response.status };
  }
  if (response.status === 429) return { ok: false, code: 'rate_limit', status: 429 };
  return { ok: false, code: 'unknown', status: response.status };
}
