import { redirect } from 'next/navigation';
import { LoginCard } from '../../components/auth/LoginCard';
import { auth, googleEnabled } from '../../lib/auth';
import { safeCallbackPath } from '../../lib/require-user';

type Props = { searchParams: Promise<{ callbackUrl?: string | string[]; error?: string | string[] }> };

// Auth.js sends errors here as ?error=...; only a few are worth a sentence.
function errorMessage(code: string | string[] | undefined): string | null {
  if (!code) return null;
  return code === 'AccessDenied' ? 'Google sign-in was refused. Use a Google account with a verified email.' : 'Sign-in failed. Please try again.';
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = safeCallbackPath(params.callbackUrl);
  if ((await auth())?.user?.id) redirect(callbackUrl);
  return (
    <main className="grid h-full place-items-center overflow-y-auto p-4">
      <LoginCard googleEnabled={googleEnabled} callbackUrl={callbackUrl} initialError={errorMessage(params.error)} />
    </main>
  );
}
