'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type Preferences = { showRir: boolean; setShowRir: (value: boolean) => void };

// Display preferences of the signed-in user (loaded by the root layout, changed in the account menu).
// Without a provider (signed out) everything shows.
const PreferencesContext = createContext<Preferences>({ showRir: true, setShowRir: () => undefined });

export function PreferencesProvider({ initialShowRir, children }: { initialShowRir: boolean; children: ReactNode }) {
  const [showRir, setShowRir] = useState(initialShowRir);
  const value = useMemo(() => ({ showRir, setShowRir }), [showRir]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  return useContext(PreferencesContext);
}
