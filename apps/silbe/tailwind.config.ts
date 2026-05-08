import type { Config } from 'tailwindcss';

// Tailwind 4 is CSS-first — design tokens live in app/globals.css under
// @theme. This stub exists only as a hook for future plugin registration
// (e.g. typography, container queries) without touching the token surface.
const config: Config = {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx,mdx}'],
};

export default config;
