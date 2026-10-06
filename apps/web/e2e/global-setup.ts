import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { seedCatalog, seedDevUser } from '../prisma/seed-lib';

export const E2E_EMAIL = 'e2e-dev@example.com';

// Migrates and seeds TEST_DATABASE_URL, and clears mesocycles left over from earlier runs.
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('TEST_DATABASE_URL must be set in .env to run e2e tests.');
  if (url === process.env.DATABASE_URL) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');

  execFileSync(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await seedDevUser(prisma, E2E_EMAIL);
    await seedCatalog(prisma);
    await prisma.mesocycle.deleteMany({});
    await prisma.exercise.deleteMany({ where: { isCustom: true } });
  } finally {
    await prisma.$disconnect();
  }
}
