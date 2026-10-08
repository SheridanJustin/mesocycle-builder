'use client';

import type { Me } from '@mesocycle/shared';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api-client';
import { usePreferences } from '../preferences/PreferencesContext';
import { Avatar } from '../ui/Avatar';
import { AccountPanel } from './AccountPanel';

type Props = { email: string };

// The avatar in the header. It opens the account popup and loads fresh progress each time.
export function AccountMenu({ email }: Props) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { profile } = usePreferences();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .getMe()
      .then((value) => !cancelled && setMe(value))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load your account'));
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') setOpen(false);
      if (event instanceof MouseEvent && ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      cancelled = true;
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`rounded-full ring-offset-2 ring-offset-graphite-950 transition-shadow ${open ? 'ring-2 ring-aqua-400' : 'hover:ring-2 hover:ring-graphite-500'}`}
      >
        <Avatar icon={profile.avatar.icon} color={profile.avatar.color} name={profile.name || email} size="sm" />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-4rem)] w-72 overflow-y-auto rounded-2xl border border-graphite-700 bg-graphite-900 p-3 shadow-2xl shadow-black/60"
        >
          <AccountPanel me={me} profile={profile} email={email} error={error} onSignOut={() => void signOut({ redirectTo: '/login' })} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
