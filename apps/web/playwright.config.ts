import { defineConfig } from '@playwright/test';

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Set PW_CHROMIUM_EXECUTABLE to use an already-installed Chromium instead of `playwright install`.
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './e2e',
  // Tests share one database, so they run one at a time.
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    ...(executablePath ? { launchOptions: { executablePath } } : {}),
  },
  webServer: {
    // e2e runs against TEST_DATABASE_URL, never DATABASE_URL.
    command: `pnpm exec dotenv --no-override -e ../../.env -- next dev -p ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? '',
      DEV_USER_EMAIL: 'e2e-dev@example.com',
      NEXT_DIST_DIR: '.next-e2e',
    },
  },
});
