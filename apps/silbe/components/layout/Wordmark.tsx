import Image from 'next/image';
import Link from 'next/link';

type Variant = 'ink' | 'cream' | 'gold';

type Props = {
  variant?: Variant;
  width?: number;
  height?: number;
  href?: string | null;
  className?: string;
  priority?: boolean;
};

const sourceByVariant: Record<Variant, string> = {
  ink: '/brand/wordmark-hot2-transparent-ink.png',
  cream: '/brand/wordmark-hot2-transparent-cream.png',
  gold: '/brand/wordmark-hot2-transparent-gold.png',
};

export function Wordmark({ variant = 'ink', width = 140, height = 41, href = '/', className, priority = false }: Props) {
  const img = (
    <Image
      src={sourceByVariant[variant]}
      alt="SILBE"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ display: 'block', height: 'auto', width: 'auto', maxHeight: `${height}px`, maxWidth: `${width}px` }}
    />
  );
  if (!href) return img;
  return (
    <Link href={href} aria-label="SILBE — zur Startseite" style={{ display: 'inline-flex' }}>
      {img}
    </Link>
  );
}
