import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'tertiary';

type CommonProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type LinkProps = CommonProps & {
  href: string;
  external?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className'>;

type ButtonProps = CommonProps & {
  href?: undefined;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

type Props = LinkProps | ButtonProps;

const baseStyle = {
  fontFamily: 'var(--font-inter), system-ui, sans-serif',
  fontSize: '14px',
  fontWeight: 500,
  letterSpacing: '0.04em',
  borderRadius: '2px',
  padding: '14px 28px',
  transition: 'background-color 200ms ease-out, color 200ms ease-out, border-color 200ms ease-out',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  textDecoration: 'none',
  border: 0,
} as const;

const variantStyle = {
  primary: {
    backgroundColor: 'var(--color-ink)',
    color: 'var(--color-cream)',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-ink)',
    padding: '13px 27px',
  },
  tertiary: {
    backgroundColor: 'transparent',
    color: 'var(--color-ink)',
    padding: '0',
    fontSize: '14px',
    letterSpacing: '0.02em',
    textUnderlineOffset: '4px',
  },
} as const;

export function Button(props: Props) {
  const variant: Variant = props.variant ?? 'primary';
  const style = { ...baseStyle, ...variantStyle[variant] };

  if ('href' in props && props.href !== undefined) {
    const { href, external, children, className, variant: _v, ...rest } = props;
    if (external) {
      return (
        <a href={href} className={className} style={style} rel="noopener noreferrer" target="_blank" {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={className} style={style} {...rest}>
        {children}
      </Link>
    );
  }
  const { children, className, variant: _v, ...rest } = props;
  return (
    <button className={className} style={style} {...rest}>
      {children}
    </button>
  );
}
