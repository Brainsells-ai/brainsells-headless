'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';

// Editorial empty state. No icon — quote-prompted return-to-catalog
// instead of a sad-cart pictogram (Master-Playbook §7).
export function EmptyCart() {
  const closeDrawer = useCartStore((s) => s.closeDrawer);

  return (
    <div
      style={{
        padding: '64px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '16px',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: '22px',
          lineHeight: 1.35,
          color: 'var(--color-ink)',
          margin: 0,
          maxWidth: '28ch',
        }}
      >
        Noch keine Edition gewählt.
      </p>
      <p
        style={{
          fontFamily: 'var(--font-crimson), Georgia, serif',
          fontSize: '15px',
          lineHeight: 1.55,
          color: 'var(--color-taupe)',
          margin: 0,
          maxWidth: '32ch',
        }}
      >
        Stöbern Sie durch die Editionen und finden Sie die Worte, die zu Ihnen sprechen.
      </p>
      <Link
        href="/editionen"
        onClick={closeDrawer}
        className="silbe-cart-button"
        style={{
          marginTop: '8px',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-ink)',
          textDecoration: 'none',
          paddingBottom: '2px',
          borderBottom: '0.5px solid var(--color-ink)',
        }}
      >
        Zu den Editionen
      </Link>
    </div>
  );
}
