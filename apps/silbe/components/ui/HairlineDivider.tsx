import type { CSSProperties } from 'react';

type Props = {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  ariaHidden?: boolean;
};

export function HairlineDivider({ orientation = 'horizontal', className, ariaHidden = true }: Props) {
  const style: CSSProperties =
    orientation === 'horizontal'
      ? {
          borderTop: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)',
          width: '100%',
        }
      : {
          borderLeft: '0.5px solid color-mix(in srgb, var(--color-ink) 15%, transparent)',
          height: '100%',
        };
  return <div role={ariaHidden ? 'presentation' : 'separator'} aria-hidden={ariaHidden} className={className} style={style} />;
}
