import { afterEach, vi } from 'vitest';
import { sessionOverride } from './session';

// Runs in each test worker before any test imports lib/db, so Prisma talks to the test database.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('TEST_DATABASE_URL must be set in .env to run integration tests.');
if (testUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL; integration tests modify data.');
}
process.env.DATABASE_URL = testUrl;
process.env.DEV_USER_EMAIL = 'integration-dev@example.com';

// Tests have no browser session: the signed-in user is the integration dev user unless a test
// says otherwise with `signInAs` (test/helpers.ts).
vi.mock('../lib/session-user', async () => {
  const { prisma } = await import('../lib/db');
  const { sessionOverride } = await import('./session');
  return {
    sessionUserId: async () => {
      if (sessionOverride.userId !== undefined) return sessionOverride.userId;
      const user = await prisma.user.findUnique({ where: { email: 'integration-dev@example.com' } });
      return user?.id ?? null;
    },
  };
});

afterEach(() => {
  sessionOverride.userId = undefined;
});
