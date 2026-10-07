import type { Me } from '@mesocycle/shared';
import Link from 'next/link';
import type { Appearance } from '../preferences/PreferencesContext';
import { Button } from '../ui/Button';
import { AppearancePicker } from './AppearancePicker';

type Props = {
  // Null while the stats are loading.
  me: Me | null;
  fallbackName: string;
  email: string;
  error: string | null;
  showRir: boolean;
  onToggleRir: (value: boolean) => void;
  appearance: Appearance;
  onChangeAppearance: (value: Partial<Appearance>) => void;
  onSignOut: () => void;
  onNavigate: () => void;
};

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });

function Stat({ label, value, testId }: { label: string; value: number | string; testId: string }) {
  return (
    <div className="rounded-xl border border-graphite-800 bg-graphite-950/60 px-3 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-graphite-400">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums text-graphite-50" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

function signInMethods(me: Me): string {
  const methods = [me.sign_in.password && 'email and password', me.sign_in.google && 'Google'].filter(Boolean);
  return methods.length ? `Signs in with ${methods.join(' and ')}` : 'No sign-in method yet';
}

// The account panel: who is signed in, a few totals, display preferences and Sign out.
export function AccountPanel({ me, fallbackName, email, error, showRir, onToggleRir, appearance, onChangeAppearance, onSignOut, onNavigate }: Props) {
  const name = me?.name ?? fallbackName;
  const initial = (name || email).trim().charAt(0).toUpperCase() || '?';
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-aqua-400 to-verdigris-600 text-lg font-bold text-graphite-950">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-graphite-50" data-testid="account-name">
            {name || 'No name set'}
          </p>
          <p className="truncate text-sm text-graphite-400" data-testid="account-email">
            {email}
          </p>
          {me && (
            <p className="text-xs text-graphite-400">
              {signInMethods(me)} · member since {monthYear.format(new Date(me.created_at))}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-2 text-xs text-snow-100">
          {error}
        </p>
      )}

      <section aria-label="Your training">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-graphite-400">Your training</h3>
        {me ? (
          <>
            <dl className="grid grid-cols-2 gap-2">
              <Stat label="Workouts done" value={me.stats.workouts_completed} testId="stat-workouts" />
              <Stat label="Sets done" value={me.stats.sets_completed} testId="stat-sets" />
              <Stat label="Mesocycles done" value={me.stats.mesocycles_completed} testId="stat-mesocycles" />
              <Stat label="Workouts skipped" value={me.stats.workouts_skipped} testId="stat-skipped" />
            </dl>
            {me.stats.active ? (
              <Link
                href={`/mesocycles/${me.stats.active.id}`}
                onClick={onNavigate}
                data-testid="account-active"
                className="mt-2 block rounded-xl border border-graphite-800 bg-graphite-950/60 px-3 py-2 hover:border-aqua-700"
              >
                <span className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-graphite-100">{me.stats.active.name}</span>
                  <span className="shrink-0 text-xs text-graphite-400">
                    {me.stats.active.done}/{me.stats.active.total} workouts
                  </span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-graphite-800" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-shamrock-500"
                    style={{ width: `${me.stats.active.total ? (me.stats.active.done / me.stats.active.total) * 100 : 0}%` }}
                  />
                </span>
              </Link>
            ) : (
              <p className="mt-2 text-xs text-graphite-400">No active mesocycle. Lock one in to start tracking workouts.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-graphite-400">Loading…</p>
        )}
      </section>

      <section aria-label="Preferences">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-graphite-400">Preferences</h3>
        <label className="flex cursor-pointer items-start justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-graphite-100">Show RIR</span>
            <span className="block text-xs text-graphite-400">Reps in reserve on cards, plans and exports. Turn off if you don&apos;t train by RIR.</span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={showRir}
            onChange={(e) => onToggleRir(e.target.checked)}
            aria-label="Show RIR"
          />
          <span
            aria-hidden="true"
            className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-graphite-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-graphite-200 after:transition-transform peer-checked:bg-aqua-600 peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-aqua-400"
          />
        </label>
      </section>

      <section aria-label="Appearance">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-graphite-400">Appearance</h3>
        <AppearancePicker appearance={appearance} onChange={onChangeAppearance} />
      </section>

      <Button className="w-full" onClick={onSignOut}>
        Sign out
      </Button>
    </div>
  );
}
