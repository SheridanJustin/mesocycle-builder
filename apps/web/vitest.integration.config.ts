import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.int.test.ts'],
    exclude: ['**/node_modules/**'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // Tests share one database, so run files one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
