import { defineConfig } from 'vitest/config';

// Unit tests only. Database-backed tests are *.int.test.ts (see vitest.integration.config.ts).
export default defineConfig({
  test: { include: ['**/*.{test,spec}.ts'], exclude: ['**/node_modules/**', '**/*.int.test.ts', 'e2e/**'] },
});
