import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Widerrufsformular',
  description:
    'Muster-Widerrufsformular zum Ausfüllen und Zurücksenden an die Brainsells e.U.',
};

const ink = 'var(--color-ink)';
const taupe = 'var(--color-taupe)';

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

const introStyle: React.CSSProperties = {
  ...pStyle,
  fontStyle: 'italic',
  color: taupe,
  margin: '0 0 32px',
};

const addressStyle: React.CSSProperties = {
  ...pStyle,
  fontStyle: 'normal',
};

const hrStyle: React.CSSProperties = {
  border: 'none',
  borderTop:
    '0.5px solid color-mix(in srgb, var(--color-ink) 30%, transparent)',
  margin: '40px 0',
};

const finalHrStyle: React.CSSProperties = {
  ...hrStyle,
  margin: '64px 0 24px',
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-crimson), Georgia, serif',
  fontSize: '19px',
  lineHeight: 1.4,
  color: ink,
  margin: '0 0 8px',
};

const blankStyle: React.CSSProperties = {
  borderBottom:
    '0.5px solid color-mix(in srgb, var(--color-ink) 40%, transparent)',
  height: '36px',
  margin: '0 0 32px',
};

const footnoteStyle: React.CSSProperties = {
  ...pStyle,
  fontSize: '15px',
  color: taupe,
  margin: '24px 0 0',
};

const standStyle: React.CSSProperties = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: taupe,
  margin: 0,
};

type FormFieldProps = { label: string };

function FormField({ label }: FormFieldProps) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <div aria-hidden="true" style={blankStyle} />
    </div>
  );
}

export default function WiderrufsformularPage() {
  return (
    <article style={containerStyle}>
      <h1 style={h1Style}>Muster-Widerrufsformular</h1>

      <p style={introStyle}>
        Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses
        Formular aus und senden Sie es zurück.
      </p>

      <p style={pStyle}>
        <strong>An:</strong>
      </p>
      <address style={addressStyle}>
        Brainsells e.U.
        <br />
        Rueppgasse 32/12
        <br />
        1020 Wien
        <br />
        Österreich
        <br />
        E-Mail:{' '}
        <a href="mailto:hallo@silbe.at" style={{ color: ink }}>
          hallo@silbe.at
        </a>
      </address>

      <hr style={hrStyle} />

      <p style={pStyle}>
        Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen
        Vertrag über den Kauf der folgenden Waren (*) / die Erbringung der
        folgenden Dienstleistung (*):
      </p>
      <div aria-hidden="true" style={blankStyle} />

      <FormField label="Bestellt am (*) / erhalten am (*):" />
      <FormField label="Name des/der Verbraucher(s):" />
      <FormField label="Anschrift des/der Verbraucher(s):" />
      <FormField label="Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):" />
      <FormField label="Datum:" />

      <p style={footnoteStyle}>(*) Unzutreffendes streichen.</p>

      <hr style={finalHrStyle} />
      <p style={standStyle}>Stand: 13. Mai 2026</p>
    </article>
  );
}
