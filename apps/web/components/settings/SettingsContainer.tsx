'use client';

import type { Me, UpdateMe } from '@mesocycle/shared';
import { signOut } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api-client';
import { usePreferences, type Appearance, type WeightUnit } from '../preferences/PreferencesContext';
import { SettingsView } from './SettingsView';

type Section = 'profile' | 'training' | 'appearance';

// Loads the account and saves each setting as it changes. The UI updates at once (also in the
// header, through the preferences context); a failed save switches it back.
export function SettingsContainer() {
  const prefs = usePreferences();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Section | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMe()
      .then((value) => !cancelled && setMe(value))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load your settings'));
    return () => {
      cancelled = true;
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  async function save(section: Section, body: UpdateMe, undo: () => void) {
    setError(null);
    try {
      setMe(await api.updateMe(body));
      setSaved(section);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(null), 2000);
    } catch (e) {
      undo();
      setError(e instanceof Error ? `Could not save: ${e.message}` : 'Could not save');
    }
  }

  if (!me) {
    return error ? (
      <main className="mx-auto max-w-xl p-6">
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-4 text-snow-100">
          {error}
        </p>
      </main>
    ) : (
      <p className="p-6 text-graphite-300">Loading…</p>
    );
  }

  const { profile, setProfile } = prefs;
  return (
    <SettingsView
      me={me}
      profile={profile}
      showRir={prefs.showRir}
      weightUnit={prefs.weightUnit}
      appearance={prefs.appearance}
      error={error}
      saved={saved}
      onSaveName={(name) => {
        const previous = profile.name;
        setProfile({ name });
        void save('profile', { name }, () => setProfile({ name: previous }));
      }}
      onChangeAvatar={(value) => {
        const previous = profile.avatar;
        setProfile({ avatar: { ...previous, ...value } });
        void save(
          'profile',
          { ...(value.icon ? { avatar_icon: value.icon } : {}), ...(value.color ? { avatar_color: value.color } : {}) },
          () => setProfile({ avatar: previous }),
        );
      }}
      onToggleRir={(value) => {
        prefs.setShowRir(value);
        void save('training', { show_rir: value }, () => prefs.setShowRir(!value));
      }}
      onChangeWeightUnit={(value: WeightUnit) => {
        const previous = prefs.weightUnit;
        prefs.setWeightUnit(value);
        void save('training', { weight_unit: value }, () => prefs.setWeightUnit(previous));
      }}
      onChangeAppearance={(value: Partial<Appearance>) => {
        const previous = prefs.appearance;
        prefs.setAppearance(value);
        void save(
          'appearance',
          { ...(value.palette ? { palette: value.palette } : {}), ...(value.colorMode ? { color_mode: value.colorMode } : {}) },
          () => prefs.setAppearance(previous),
        );
      }}
      onSignOut={() => void signOut({ redirectTo: '/login' })}
    />
  );
}
