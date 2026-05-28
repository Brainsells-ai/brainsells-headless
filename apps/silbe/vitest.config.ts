import { defineConfig } from 'vitest/config';

// Vitest runs the in-tree *.test.ts unit tests next to the lib code they cover.
// Playwright specs under tests/e2e/**/*.spec.ts use their own test runner — they
// import `test` from '@playwright/test', not from vitest, so vitest must not
// pick them up.

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', 'tests/e2e/**'],
  },
});
