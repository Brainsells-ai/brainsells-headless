'use client';

// PDP client island for the view_item event. The parent server component
// (editionen/[handle]/page.tsx) prebuilds the GA4 item from the default
// variant so this island receives plain serializable props — no ParsedProduct
// crosses the RSC boundary for tracking.
//
// Fires once per PDP mount with the default variant. Client-side format
// switches (?variant=A2) do not re-fire view_item — variant choice surfaces
// in add_to_cart, which carries the Shopify-confirmed variant.

import { useEffect } from 'react';
import { trackViewItem, type Ga4Item } from '@/lib/tracking/events';

type Props = {
  item: Ga4Item;
  currency: string;
};

export function TrackViewItem({ item, currency }: Props) {
  useEffect(() => {
    trackViewItem(item, currency);
    // Intentionally mount-only: item/currency are stable per PDP render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
