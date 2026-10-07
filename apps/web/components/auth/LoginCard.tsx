'use client';

import { MIN_PASSWORD_LENGTH } from '@mesocycle/shared';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useState, type FormEvent } from 'react';
import { api, ApiClientError } from '../../lib/api-client';
import { Button } from '../ui/Button';

type Mode = 'signin' | 'register';
type Props = { googleEnabled: boolean; callbackUrl: string; initialError?: string | null };

const field = 'mt-1 w-full rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-50';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1S8.7 5.7 12 5.7c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Something went wrong. Please try again.';
  // Validation failures carry the field messages (e.g. "Use at least 8 characters").
  if (error instanceof ApiClientError && error.code === 'VALIDATION_ERROR' && error.details.length > 0) {
    return error.details.map((d) => d.issue).join(' ');
  }
  return error.message;
}

// Sign in, create an account (email and password), or continue with Google.
export function LoginCard({ googleEnabled, callbackUrl, initialError = null }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '');
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') await api.register({ email, password, ...(name ? { name } : {}) });
      const result = await signIn('credentials', { email, password, redirect: false });
      if (!result || result.error) {
        setError('Email or password is incorrect.');
        setBusy(false);
        return;
      }
      router.replace(callbackUrl);
      router.refresh();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  const tab = (id: Mode, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === id}
      onClick={() => {
        setMode(id);
        setError(null);
      }}
      className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
        mode === id ? 'bg-aqua-500 text-graphite-950 shadow' : 'text-graphite-300 hover:text-graphite-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-sm rounded-2xl border border-graphite-800 bg-graphite-900/90 p-6 shadow-2xl shadow-black/40">
      <h1 className="text-xl font-semibold tracking-tight">{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
      <p className="mt-1 text-sm text-graphite-400">Your mesocycles are saved to your account.</p>

      <div role="tablist" aria-label="Sign in or create an account" className="mt-4 flex rounded-xl border border-graphite-800 bg-graphite-950 p-0.5">
        {tab('signin', 'Sign in')}
        {tab('register', 'Create account')}
      </div>

      <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-3" aria-label={mode === 'signin' ? 'Sign in' : 'Create account'}>
        {mode === 'register' && (
          <label className="block text-sm font-medium text-graphite-200">
            Name <span className="font-normal text-graphite-500">(optional)</span>
            <input name="name" autoComplete="name" maxLength={100} className={field} />
          </label>
        )}
        <label className="block text-sm font-medium text-graphite-200">
          Email
          <input type="email" name="email" autoComplete="email" required className={field} />
        </label>
        <label className="block text-sm font-medium text-graphite-200">
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? MIN_PASSWORD_LENGTH : undefined}
            required
            className={field}
          />
          {mode === 'register' && <span className="mt-1 block text-xs font-normal text-graphite-500">At least {MIN_PASSWORD_LENGTH} characters.</span>}
        </label>
        {error && (
          <p role="alert" className="rounded-lg border border-snow-700 bg-snow-900 p-2 text-sm text-snow-100">
            {error}
          </p>
        )}
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-4 flex items-center gap-3 text-xs text-graphite-500" aria-hidden="true">
            <span className="h-px flex-1 bg-graphite-800" />
            or
            <span className="h-px flex-1 bg-graphite-800" />
          </div>
          <Button className="w-full" disabled={busy} onClick={() => void signIn('google', { redirectTo: callbackUrl })}>
            <GoogleIcon />
            Continue with Google
          </Button>
        </>
      )}
    </div>
  );
}
