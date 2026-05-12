import { CapsLabel } from '@/components/primitives/CapsLabel';

// Non-clickable per Phase-3 plan. Phase 5 wires these to filter routes
// (e.g. /editionen?theme=Geduld). For now: read-only list separated by
// middots, italic body-font.

type ThemeTagsProps = {
  themes: readonly string[];
};

export function ThemeTags({ themes }: ThemeTagsProps) {
  if (themes.length === 0) return null;

  return (
    <section
      aria-label="Themen"
      style={{
        maxWidth: 'var(--container-default)',
        margin: '0 auto',
        padding: 'clamp(32px, 4vw, 56px) 24px',
      }}
    >
      <div style={{ display: 'grid', gap: '20px' }}>
        <CapsLabel>Themen</CapsLabel>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px 20px',
            fontFamily: 'var(--font-crimson), Georgia, serif',
            fontStyle: 'italic',
            fontSize: '15px',
            color: 'var(--color-ink)',
          }}
        >
          {themes.map((t, i) => (
            <li key={t} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '20px' }}>
              <span>{t}</span>
              {i < themes.length - 1 && (
                <span aria-hidden="true" style={{ color: 'var(--color-taupe)' }}>·</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
