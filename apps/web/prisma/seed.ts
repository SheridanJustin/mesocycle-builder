import { PrismaClient } from '@prisma/client';
import { seedCatalog, seedDevUser } from './seed-lib';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEV_USER_EMAIL;
  if (!email) throw new Error('DEV_USER_EMAIL must be set in .env before running db:seed.');
  await seedDevUser(prisma, email);
  await seedCatalog(prisma);
}

main().then(() => prisma.$disconnect()).catch(async (error: unknown) => { await prisma.$disconnect(); throw error; });
