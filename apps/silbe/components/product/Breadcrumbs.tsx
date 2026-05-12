import Link from 'next/link';

// Static breadcrumb: Home › Editionen › {productTitle}. Phase 3 ships
// with /editionen as a known 404 (Phase 5 listing route not yet built —
// polish-list item). Link kept regardless; 404 is documented.

type BreadcrumbsProps = {
  productTitle: string;
};

const SEP = (
  <span aria-hidden="true" style={{ opacity: 0.6 }}>
    ›
  </span>
);

const LINK_STYLE = {
  color: 'inherit',
  textDecoration: 'none',
} as const;

export function Breadcrumbs({ productTitle }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        maxWidth: 'var(--container-wide)',
        margin: '0 auto',
        padding: '24px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        fontSize: '11px',
        letterSpacing: '0.08em',
        color: 'var(--color-taupe)',
      }}
    >
      <ol
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'baseline',
        }}
      >
        <li>
          <Link href="/" style={LINK_STYLE}>
            Home
          </Link>
        </li>
        <li>{SEP}</li>
        <li>
          <Link href="/editionen" style={LINK_STYLE}>
            Editionen
          </Link>
        </li>
        <li>{SEP}</li>
        <li aria-current="page" style={{ color: 'var(--color-ink)' }}>
          {productTitle}
        </li>
      </ol>
    </nav>
  );
}
