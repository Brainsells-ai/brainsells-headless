import { CapsLabel } from '@/components/primitives/CapsLabel';

const ITEMS = [
  {
    label: 'Material',
    body: 'Hochweißes Premium-Papier · 200 g/m² · matt · säurefrei',
  },
  {
    label: 'Druck',
    body: 'Gedruckt in der EU · überwiegend Deutschland',
  },
  {
    label: 'Versand',
    body: 'Versand 3–6 Werktage · DE · AT · ab €39 frei',
  },
  {
    label: 'Kuration',
    body: 'Kuratiert in Wien · Per Hand · primärquellenverifiziert',
  },
] as const;

const HAIRLINE = '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)';

export function TrustBar() {
  return (
    <section
      aria-label="Vertrauen — Material, Druck, Versand, Kuration"
      style={{
        backgroundColor: 'var(--color-cream)',
        borderTop: HAIRLINE,
        borderBottom: HAIRLINE,
      }}
    >
      <ul
        className="silbe-trustbar-grid"
        style={{
          maxWidth: 'var(--container-wide)',
          margin: '0 auto',
          padding: '32px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '24px 32px',
          listStyle: 'none',
        }}
      >
        {ITEMS.map((item) => (
          <li key={item.label} style={{ display: 'grid', gap: '6px' }}>
            <CapsLabel>{item.label}</CapsLabel>
            <p
              lang="de"
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontSize: '13px',
                lineHeight: 1.5,
                color: 'var(--color-ink)',
                margin: 0,
                textWrap: 'balance',
              }}
            >
              {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
