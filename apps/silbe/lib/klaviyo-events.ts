// Klaviyo event tracking for the § 356a BGB Widerruf flow.
//
// Companion to lib/klaviyo.ts (newsletter signup). This module fires the
// `Widerruf Eingegangen` metric, which a LIVE Klaviyo flow ("Widerruf
// Bestätigung") listens on to send the customer their confirmation e-mail.
// The metric + flow + template already exist in Klaviyo — this code only has
// to fire the event with the right properties.
//
// Fail-soft by design: Shopify (tag + note) is the source of truth and is
// written first. A failed Klaviyo event must NOT fail the submit — the
// Widerruf is already legally received (§ 356a Abs. 5 BGB). We log and move on.
//
// Endpoint: POST /api/events/  ·  Docs: https://developers.klaviyo.com/en/reference/create_event

const KLAVIYO_API_BASE = 'https://a.klaviyo.com/api';
const KLAVIYO_REVISION = '2024-10-15';

export type KlaviyoEventResult = { ok: boolean };

export async function trackKlaviyoEvent(
  eventName: string,
  email: string,
  properties: Record<string, unknown>,
): Promise<KlaviyoEventResult> {
  const privateKey = process.env.KLAVIYO_PRIVATE_KEY;
  if (!privateKey) {
    console.error('[klaviyo-events] KLAVIYO_PRIVATE_KEY not set — skipping event', eventName);
    return { ok: false };
  }

  const body = {
    data: {
      type: 'event',
      attributes: {
        properties,
        metric: { data: { type: 'metric', attributes: { name: eventName } } },
        profile: { data: { type: 'profile', attributes: { email } } },
      },
    },
  };

  let response: Response;
  try {
    response = await fetch(`${KLAVIYO_API_BASE}/events/`, {
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
  } catch (err) {
    console.error('[klaviyo-events] request failed:', eventName, err);
    return { ok: false };
  }

  // The events endpoint returns 202 Accepted on success.
  if (response.status === 202) return { ok: true };

  console.error(
    `[klaviyo-events] event "${eventName}" failed: ${response.status} ${await response.text()}`,
  );
  return { ok: false };
}
