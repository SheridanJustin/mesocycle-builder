'use client';

import { signOut } from 'next-auth/react';
import { Button } from '../ui/Button';

// The signed-in user in the header, with Sign out.
export function AccountMenu({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-48 truncate text-sm text-graphite-300 sm:inline" data-testid="account-label" title={label}>
        {label}
      </span>
      <Button size="sm" onClick={() => void signOut({ redirectTo: '/login' })}>
        Sign out
      </Button>
    </div>
  );
}
