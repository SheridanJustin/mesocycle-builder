import { auth } from './auth';

// The signed-in user's id, or null. The single place that reads the session (tests replace it).
export async function sessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
