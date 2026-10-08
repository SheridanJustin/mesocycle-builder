'use client';

import { AVATAR_COLORS, AVATAR_ICONS, type Me } from '@mesocycle/shared';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AppearancePicker } from '../auth/AppearancePicker';
import type { Appearance, Profile, WeightUnit } from '../preferences/PreferencesContext';
import { Avatar, AVATAR_BACKGROUND, AVATAR_COLOR_LABEL, AVATAR_ICON_LABEL, type AvatarColor, type AvatarIcon } from '../ui/Avatar';
import { Button } from '../ui/Button';

type Props = {
  me: Me;
  profile: Profile;
  showRir: boolean;
  weightUnit: WeightUnit;
  appearance: Appearance;
  error: string | null;
  // The section that just saved (shows "Saved").
  saved: string | null;
  onSaveName: (name: string | null) => void;
  onChangeAvatar: (value: Partial<Me['avatar']>) => void;
  onToggleRir: (value: boolean) => void;
  onChangeWeightUnit: (value: WeightUnit) => void;
  onChangeAppearance: (value: Partial<Appearance>) => void;
  onSignOut: () => void;
};

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const heading = 'text-sm font-semibold uppercase tracking-wider text-graphite-400';
const choice = 'cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-aqua-400';

function Section({ id, title, saved, children }: { id: string; title: string; saved: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-graphite-800 bg-graphite-900/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id} className={heading}>
          {title}
        </h2>
        {saved && (
          <span role="status" className="text-xs font-medium text-shamrock-300">
            Saved
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
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
  return methods.length ? methods.join(' and ') : 'none yet';
}

// The settings page (SPEC decision 22): profile and avatar, training preferences, appearance,
// account details and training totals. Every change saves at once.
export function SettingsView(props: Props) {
  const { me, profile, showRir, weightUnit, appearance, error, saved } = props;
  const [name, setName] = useState(profile.name ?? '');
  const displayName = profile.name || me.email;

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    props.onSaveName(name.trim() ? name.trim() : null);
  }

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-graphite-400">Changes save automatically and follow your account to other devices.</p>
        </div>
        {error && (
          <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
            {error}
          </p>
        )}

        <Section id="settings-profile" title="Profile" saved={saved === 'profile'}>
          <div className="flex items-center gap-4">
            <Avatar icon={profile.avatar.icon} color={profile.avatar.color} name={displayName} size="lg" />
            <form onSubmit={submitName} className="grid flex-1 gap-1.5">
              <label htmlFor="settings-name" className="text-sm font-medium text-graphite-100">
                Name
              </label>
              <div className="flex gap-2">
                <input
                  id="settings-name"
                  value={name}
                  maxLength={100}
                  autoComplete="name"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="min-w-0 flex-1 rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-sm text-graphite-50 placeholder:text-graphite-400"
                />
                <Button type="submit" disabled={name.trim() === (profile.name ?? '')}>
                  Save
                </Button>
              </div>
            </form>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-graphite-100">Avatar icon</legend>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-2">
              {AVATAR_ICONS.map((icon: AvatarIcon) => (
                <label
                  key={icon}
                  title={AVATAR_ICON_LABEL[icon]}
                  className={`${choice} grid place-items-center rounded-xl border p-1.5 ${
                    profile.avatar.icon === icon ? 'border-aqua-400 bg-graphite-800' : 'border-graphite-800 hover:border-graphite-600'
                  }`}
                >
                  <input type="radio" name="avatar-icon" value={icon} checked={profile.avatar.icon === icon} onChange={() => props.onChangeAvatar({ icon })} className="sr-only" />
                  <span className="sr-only">{AVATAR_ICON_LABEL[icon]}</span>
                  <Avatar icon={icon} color={profile.avatar.color} name={displayName} size="sm" />
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-medium text-graphite-100">Avatar color</legend>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color: AvatarColor) => (
                <label
                  key={color}
                  title={AVATAR_COLOR_LABEL[color]}
                  className={`${choice} rounded-full p-0.5 ring-2 ${profile.avatar.color === color ? 'ring-aqua-400' : 'ring-transparent hover:ring-graphite-600'}`}
                >
                  <input type="radio" name="avatar-color" value={color} checked={profile.avatar.color === color} onChange={() => props.onChangeAvatar({ color })} className="sr-only" />
                  <span className="sr-only">{AVATAR_COLOR_LABEL[color]}</span>
                  <span aria-hidden="true" className={`block h-8 w-8 rounded-full ${AVATAR_BACKGROUND[color]}`} />
                </label>
              ))}
            </div>
          </fieldset>
        </Section>

        <Section id="settings-training" title="Training" saved={saved === 'training'}>
          <label className="flex cursor-pointer items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-graphite-100">Show RIR</span>
              <span className="block text-xs text-graphite-400">Reps in reserve on cards, plans and exports. Turn off if you don&apos;t train by RIR.</span>
            </span>
            <input type="checkbox" role="switch" className="peer sr-only" checked={showRir} onChange={(e) => props.onToggleRir(e.target.checked)} aria-label="Show RIR" />
            <span
              aria-hidden="true"
              className="relative mt-0.5 h-5 w-9 shrink-0 rounded-full bg-graphite-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-graphite-200 after:transition-transform peer-checked:bg-aqua-600 peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-aqua-400"
            />
          </label>
          <fieldset className="mt-4 flex items-start justify-between gap-3">
            <legend className="float-left">
              <span className="block text-sm font-medium text-graphite-100">Weight unit</span>
              <span className="block text-xs text-graphite-400">The label of logged weights. Numbers are not converted.</span>
            </legend>
            <span className="flex shrink-0 rounded-lg border border-graphite-700 bg-graphite-950 p-0.5">
              {(['kg', 'lb'] as const).map((unit) => (
                <label
                  key={unit}
                  className={`${choice} rounded-md px-3 py-0.5 text-sm font-medium ${weightUnit === unit ? 'bg-aqua-500 text-graphite-950' : 'text-graphite-300 hover:text-graphite-50'}`}
                >
                  <input type="radio" name="weight-unit" value={unit} checked={weightUnit === unit} onChange={() => props.onChangeWeightUnit(unit)} className="sr-only" />
                  {unit}
                </label>
              ))}
            </span>
          </fieldset>
        </Section>

        <Section id="settings-appearance" title="Appearance" saved={saved === 'appearance'}>
          <AppearancePicker appearance={appearance} onChange={props.onChangeAppearance} />
        </Section>

        <Section id="settings-stats" title="Your training" saved={false}>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Workouts done" value={me.stats.workouts_completed} testId="stat-workouts" />
            <Stat label="Sets done" value={me.stats.sets_completed} testId="stat-sets" />
            <Stat label="Mesocycles done" value={me.stats.mesocycles_completed} testId="stat-mesocycles" />
            <Stat label="Workouts skipped" value={me.stats.workouts_skipped} testId="stat-skipped" />
          </dl>
          <Link href="/records" className="mt-3 inline-block text-sm font-medium text-aqua-300 hover:underline">
            Personal bests →
          </Link>
        </Section>

        <Section id="settings-account" title="Account" saved={false}>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-graphite-400">Email</dt>
              <dd className="truncate text-graphite-100" data-testid="settings-email">
                {me.email}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-graphite-400">Sign-in</dt>
              <dd className="text-graphite-100">{signInMethods(me)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-graphite-400">Member since</dt>
              <dd className="text-graphite-100">{monthYear.format(new Date(me.created_at))}</dd>
            </div>
          </dl>
          <Button className="mt-4 w-full sm:w-auto" onClick={props.onSignOut}>
            Sign out
          </Button>
        </Section>
      </div>
    </main>
  );
}
