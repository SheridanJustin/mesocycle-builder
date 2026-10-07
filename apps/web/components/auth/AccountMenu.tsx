'use client';

import type { Me } from '@mesocycle/shared';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api-client';
import { usePreferences } from '../preferences/PreferencesContext';
import { AccountPanel } from './AccountPanel';

type Props = { name: string | null; email: string };

function PersonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </svg>
  );
}

// The person icon in the header. It opens the account panel and loads fresh stats each time.
export function AccountMenu({ name, email }: Props) {
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showRir, setShowRir } = usePreferences();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api
      .getMe()
      .then((value) => !cancelled && setMe(value))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load your stats'));
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

  // Optimistic: the UI changes at once; on failure it switches back.
  async function toggleRir(value: boolean) {
    setShowRir(value);
    setError(null);
    try {
      setMe(await api.updateMe({ show_rir: value }));
    } catch (e) {
      setShowRir(!value);
      setError(e instanceof Error ? `Could not save the setting: ${e.message}` : 'Could not save the setting');
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`grid h-8 w-8 place-items-center rounded-full border transition-colors ${
          open ? 'border-aqua-500 bg-aqua-950 text-aqua-200' : 'border-graphite-700 bg-graphite-900 text-graphite-200 hover:border-aqua-600 hover:text-aqua-200'
        }`}
      >
        <PersonIcon />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Account"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-graphite-700 bg-graphite-900 p-4 shadow-2xl shadow-black/60"
        >
          <AccountPanel
            me={me}
            fallbackName={name ?? ''}
            email={email}
            error={error}
            showRir={showRir}
            onToggleRir={(value) => void toggleRir(value)}
            onSignOut={() => void signOut({ redirectTo: '/login' })}
            onNavigate={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
