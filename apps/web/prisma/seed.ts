import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEV_USER_EMAIL;
  if (!email) throw new Error('DEV_USER_EMAIL must be set in .env before running db:seed.');
  await prisma.user.upsert({ where: { email }, update: {}, create: { email } });
}

main().then(() => prisma.$disconnect()).catch(async (error: unknown) => { await prisma.$disconnect(); throw error; });
