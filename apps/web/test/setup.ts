// Runs in each test worker before any test imports lib/db, so Prisma talks to the test database.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('TEST_DATABASE_URL must be set in .env to run integration tests.');
if (testUrl === process.env.DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL; integration tests modify data.');
}
process.env.DATABASE_URL = testUrl;
process.env.DEV_USER_EMAIL = 'integration-dev@example.com';
