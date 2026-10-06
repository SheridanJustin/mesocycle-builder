import type { User } from '@prisma/client';
import { prisma } from './db';

// Auth is out of scope (SPEC 2.1): the "current user" is the seeded dev user.
export async function getCurrentUser(): Promise<User> {
  const email = process.env.DEV_USER_EMAIL;
  if (!email) throw new Error('DEV_USER_EMAIL is not set. Add it to .env (see .env.example).');
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Dev user ${email} not found. Run pnpm db:seed.`);
  return user;
}
