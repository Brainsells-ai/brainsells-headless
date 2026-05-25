import type { Metadata } from 'next';
import Link from 'next/link';
import { verifyWiderrufToken } from '@/lib/widerruf-token';
import { getWiderrufOrderById, type WiderrufOrder } from '@/lib/shopify-order-lookup';
import { WiderrufConfirmForm } from '@/components/widerruf/WiderrufConfirmForm';

// Token verification (node:crypto) runs in this server component and in the
// submit action invoked from it — pin Node, not Edge.
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Widerruf bestätigen',
  description: 'Bestätigen Sie Ihren Widerruf gemäß § 356a BGB.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/widerruf/bestaetigen' },
};

const ink = 'var(--color-ink)';

const containerStyle: React.CSSProperties = {
  maxWidth: 'var(--container-narrow, 720px)',
  margin: '0 auto',
  padding: 'clamp(96px, 10vw, 144px) 24px',
};

const h1Style: React.CSSProperties = {
  fontFamily: 'var(--font-cormorant), Georgia, serif',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 'clamp(36px, 5vw, 56px)',
  lineHeight: 1.1,
  color: ink,
  margin: '0 0 32px',
  textWrap: 'balance',
};

const pStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '19px',
  lineHeight: 1.7,
  color: ink,
  margin: '0 0 16px',
  textWrap: 'pretty',
};

function pickToken(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function formatPrice(amount: string, currencyCode: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'long' }).format(date);
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '11px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--color-taupe)',
};

const detailBoxStyle: React.CSSProperties = {
  border: '0.5px solid color-mix(in srgb, var(--color-ink) 20%, transparent)',
  borderRadius: '2px',
  padding: '24px',
  margin: '32px 0',
  display: 'grid',
  gap: '16px',
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '24px',
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '17px',
  lineHeight: 1.6,
  color: 'var(--color-ink)',
};

function OrderDetails({ order }: { order: WiderrufOrder }) {
  return (
    <div style={detailBoxStyle}>
      <div style={rowStyle}>
        <span style={labelStyle}>Bestellnummer</span>
        <span>{order.name}</span>
      </div>
      <div style={rowStyle}>
        <span style={labelStyle}>Bestelldatum</span>
        <span>{formatDate(order.createdAt)}</span>
      </div>
      <hr style={{ border: 'none', borderTop: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)', margin: 0 }} />
      {order.lineItems.map((item, i) => (
        <div key={i} style={rowStyle}>
          <span>
            {item.quantity}× {item.title}
          </span>
          <span>{formatPrice(item.amount, item.currencyCode)}</span>
        </div>
      ))}
      <hr style={{ border: 'none', borderTop: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)', margin: 0 }} />
      <div style={{ ...rowStyle, fontWeight: 600 }}>
        <span>Gesamtbetrag</span>
        <span>{formatPrice(order.totalAmount, order.currencyCode)}</span>
      </div>
    </div>
  );
}

export default async function WiderrufBestaetigenPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const token = pickToken((await searchParams).token);
  const payload = verifyWiderrufToken(token);

  if (!payload) {
    return (
      <main style={containerStyle}>
        <h1 style={h1Style}>Widerruf-Link ungültig</h1>
        <p style={pStyle}>
          Dieser Widerruf-Link ist ungültig oder abgelaufen. Bitte starten Sie den Widerruf erneut
          über <Link href="/widerruf">silbe.at/widerruf</Link>.
        </p>
      </main>
    );
  }

  // Token proves the email; fetch fresh order details for the confirm step.
  let order: WiderrufOrder | null = null;
  let fetchFailed = false;
  try {
    order = await getWiderrufOrderById(payload.orderId);
  } catch (err) {
    console.error('[widerruf-bestaetigen] order fetch failed:', err);
    fetchFailed = true;
  }

  if (fetchFailed) {
    return (
      <main style={containerStyle}>
        <h1 style={h1Style}>Widerruf bestätigen</h1>
        <p style={pStyle}>
          Die Bestelldaten konnten derzeit nicht geladen werden. Bitte versuchen Sie es später
          erneut oder widerrufen Sie per E-Mail an <Link href="mailto:hallo@silbe.at">hallo@silbe.at</Link>.
        </p>
      </main>
    );
  }

  if (order && order.tags.includes('widerrufen')) {
    return (
      <main style={containerStyle}>
        <h1 style={h1Style}>Bereits widerrufen</h1>
        <p style={pStyle}>Dieser Vertrag wurde bereits widerrufen.</p>
      </main>
    );
  }

  return (
    <main style={containerStyle}>
      {/* Stufe 2 — exakter Wortlaut der Schaltfläche „Widerruf bestätigen“ gem. § 356a BGB. */}
      <h1 style={h1Style}>Widerruf bestätigen</h1>

      <p style={pStyle}>Sie widerrufen den folgenden Vertrag:</p>

      {order ? (
        <OrderDetails order={order} />
      ) : (
        <p style={pStyle}>Bestellung mit der E-Mail {payload.email}.</p>
      )}

      <WiderrufConfirmForm token={token} />
    </main>
  );
}
