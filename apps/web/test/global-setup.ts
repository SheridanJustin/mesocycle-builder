import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { seedCatalog, seedDevUser } from '../prisma/seed-lib';

const require = createRequire(import.meta.url);

// Applies migrations to TEST_DATABASE_URL (Prisma creates the database if it is missing)
// and seeds the catalog and the dev user once per run.
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL must be set in .env to run integration tests.');
  if (url === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');

  const prismaCli = require.resolve('prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await seedDevUser(prisma, 'integration-dev@example.com');
    await seedCatalog(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
