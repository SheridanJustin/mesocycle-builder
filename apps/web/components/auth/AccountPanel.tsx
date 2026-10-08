import type { Me } from '@mesocycle/shared';
import Link from 'next/link';
import type { Profile } from '../preferences/PreferencesContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

type Props = {
  // Null while loading.
  me: Me | null;
  profile: Profile;
  email: string;
  error: string | null;
  onSignOut: () => void;
  onNavigate: () => void;
};

const item = 'flex items-center justify-between rounded-lg px-2.5 py-2 text-sm font-medium text-graphite-100 hover:bg-graphite-800';

// The account popup: who is signed in, the running mesocycle, and links. Everything else is on
// the settings page (SPEC decision 22).
export function AccountPanel({ me, profile, email, error, onSignOut, onNavigate }: Props) {
  const name = profile.name ?? '';
  const active = me?.stats.active ?? null;
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <Avatar icon={profile.avatar.icon} color={profile.avatar.color} name={name || email} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-graphite-50" data-testid="account-name">
            {name || 'No name set'}
          </p>
          <p className="truncate text-sm text-graphite-400" data-testid="account-email">
            {email}
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-2 text-xs text-snow-100">
          {error}
        </p>
      )}

      {active ? (
        <Link
          href={`/mesocycles/${active.id}`}
          onClick={onNavigate}
          data-testid="account-active"
          className="block rounded-xl border border-graphite-800 bg-graphite-950/60 px-3 py-2 hover:border-aqua-700"
        >
          <span className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium text-graphite-100">{active.name}</span>
            <span className="shrink-0 text-xs text-graphite-400">
              {active.done}/{active.total} workouts
            </span>
          </span>
          <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-graphite-800" aria-hidden="true">
            <span className="block h-full rounded-full bg-shamrock-500" style={{ width: `${active.total ? (active.done / active.total) * 100 : 0}%` }} />
          </span>
        </Link>
      ) : (
        me && <p className="text-xs text-graphite-400">No active mesocycle. Lock one in to start tracking workouts.</p>
      )}

      <nav aria-label="Account" className="grid border-t border-graphite-800 pt-2">
        <Link href="/records" onClick={onNavigate} className={item}>
          Personal bests <span aria-hidden="true">→</span>
        </Link>
        <Link href="/settings" onClick={onNavigate} className={item}>
          Settings <span aria-hidden="true">→</span>
        </Link>
      </nav>

      <Button className="w-full" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
