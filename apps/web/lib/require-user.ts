import { redirect } from 'next/navigation';
import { auth } from './auth';

// Only same-site paths are allowed as a post-login destination (no open redirects).
export function safeCallbackPath(value: string | string[] | undefined): string {
  const path = Array.isArray(value) ? value[0] : value;
  return path && path.startsWith('/') && !path.startsWith('//') && !path.startsWith('/\\') ? path : '/mesocycles';
}

// Pages call this first: signed-out visitors are sent to the login page and come back afterwards.
export async function requirePageUser(path: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
}
