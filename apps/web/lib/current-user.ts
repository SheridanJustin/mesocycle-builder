import type { User } from '@prisma/client';
import { ApiRouteError } from './api';
import { prisma } from './db';
import { sessionUserId } from './session-user';

// The signed-in user. API routes call this first, so every query is scoped to them (SPEC 2.1);
// without a session (or for a deleted user) the request fails with 401.
export async function getCurrentUser(): Promise<User> {
  const id = await sessionUserId();
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (!user) throw new ApiRouteError('UNAUTHORIZED', 'Sign in to continue');
  return user;
}
