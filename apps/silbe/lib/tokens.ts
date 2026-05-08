// Mirrored from docs/brand-tokens.md (canonical). When a token changes, update
// brand-tokens.md first, then sync this file. Never the other direction.

export const colors = {
  cream: '#F2EBDB',
  ink: '#1A1814',
  burgundy: '#5C1A1B',
  sage: '#9AA393',
  taupe: '#8B7865',
  staubrose: '#D4A894',
  gold: '#B8955C',
  deepOlive: '#4A5640',
  softBeige: '#E8DCC7',
  charcoal: '#3A3835',
} as const;

export const fonts = {
  serif: 'var(--font-cormorant), Georgia, serif',
  body: 'var(--font-crimson), Georgia, serif',
  sans: 'var(--font-inter), system-ui, sans-serif',
  accent: 'var(--font-playfair), Georgia, serif',
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px',
} as const;

export const containers = {
  prose: '640px',
  narrow: '720px',
  default: '1120px',
  wide: '1440px',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export const motion = {
  duration: {
    hover: '200ms',
    state: '320ms',
    reveal: '480ms',
    page: '720ms',
  },
  easing: {
    out: 'cubic-bezier(0, 0, 0.2, 1)',
  },
} as const;

export const tokens = {
  colors,
  fonts,
  spacing,
  containers,
  breakpoints,
  motion,
} as const;

export type Tokens = typeof tokens;
