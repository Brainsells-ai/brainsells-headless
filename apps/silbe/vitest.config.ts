import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Vitest runs the in-tree *.test.ts unit tests next to the lib code they cover.
// Playwright specs under tests/e2e/**/*.spec.ts use their own test runner — they
// import `test` from '@playwright/test', not from vitest, so vitest must not
// pick them up.

export default defineConfig({
  // Mirror tsconfig's `@/*` path alias. Until now every test either used
  // relative imports or vi.mock'ed its `@/`-imports away, so the missing
  // alias never surfaced; lib/tracking tests load real `@/lib/consent` code.
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
});
