import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

type Props = {
  count?: number;
};

// Server Component — renders the icon + optional badge. The cart store and
// drawer interactivity arrive in Phase 4; for now `count` is read-only.
export function CartIndicator({ count = 0 }: Props) {
  return (
    <Link
      href="/warenkorb"
      aria-label={count > 0 ? `Warenkorb (${count} Edition${count === 1 ? '' : 'en'})` : 'Warenkorb (leer)'}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        color: 'var(--color-ink)',
        textDecoration: 'none',
      }}
    >
      <ShoppingBag size={20} strokeWidth={1.25} aria-hidden />
      {count > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            minWidth: '16px',
            height: '16px',
            padding: '0 4px',
            borderRadius: '8px',
            backgroundColor: 'var(--color-burgundy)',
            color: 'var(--color-cream)',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
            fontSize: '10px',
            fontWeight: 500,
            lineHeight: '16px',
            textAlign: 'center',
            letterSpacing: '0',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
