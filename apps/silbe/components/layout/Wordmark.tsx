import Image from 'next/image';
import Link from 'next/link';

type Variant = 'ink' | 'cream' | 'gold';

type Props = {
  variant?: Variant;
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

// Intrinsic dimensions of the HOT 2 wordmark PNGs (logos-final canonical
// renders): 1027 × 302. Width is derived from height to preserve aspect.
const INTRINSIC_RATIO = 1027 / 302;

export function Wordmark({ variant = 'ink', height = 32, href = '/', className, priority = false }: Props) {
  const width = Math.round(height * INTRINSIC_RATIO);
  const img = (
    <Image
      src={sourceByVariant[variant]}
      alt="SILBE"
      width={width}
      height={height}
      priority={priority}
      className={className}
      style={{ display: 'block' }}
    />
  );
  if (!href) return img;
  return (
    <Link href={href} aria-label="SILBE — zur Startseite" style={{ display: 'inline-flex' }}>
      {img}
    </Link>
  );
}
