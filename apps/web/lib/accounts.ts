import type { Register } from '@mesocycle/shared';
import type { User } from '@prisma/client';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { hashPassword, verifyPassword } from './passwords';

// A password hash to compare against when the email is unknown, so a wrong email and a wrong
// password take about as long (no account enumeration by timing).
let dummyHash: Promise<string> | null = null;

// Creates an email/password account. The seeded dev user (no password, no Google link) can be
// claimed outside production, so the data created before accounts existed is not lost.
export async function registerUser(input: Register): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    const claimable = !existing.passwordHash && !existing.googleId && process.env.NODE_ENV !== 'production';
    if (!claimable) throw new ApiRouteError('CONFLICT', 'An account with this email already exists. Sign in instead.');
    return prisma.user.update({ where: { id: existing.id }, data: { passwordHash, name: input.name ?? existing.name } });
  }
  return prisma.user.create({ data: { email: input.email, passwordHash, name: input.name ?? null } });
}

// Email/password sign-in. Returns null for any mismatch (unknown email, wrong password, Google-only account).
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user?.passwordHash) {
    dummyHash ??= hashPassword('timing-equalizer');
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? user : null;
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string | null };

// Google sign-in: the Google account is found by its id, or linked to the account with the same
// (Google-verified) email, or a new account is created. Unverified emails are refused.
export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<User> {
  const byGoogle = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (byGoogle) return byGoogle;
  if (!profile.emailVerified) throw new ApiRouteError('UNAUTHORIZED', 'Your Google email address is not verified');
  const email = profile.email.trim().toLowerCase();
  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub, name: byEmail.name ?? profile.name } });
  }
  return prisma.user.create({ data: { email, googleId: profile.sub, name: profile.name } });
}
