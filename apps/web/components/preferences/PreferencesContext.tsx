'use client';

import { DEFAULT_COLOR_MODE, DEFAULT_PALETTE, type Me } from '@mesocycle/shared';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export type Palette = Me['preferences']['palette'];
export type ColorMode = Me['preferences']['color_mode'];
export type Appearance = { palette: Palette; colorMode: ColorMode };

type Preferences = {
  showRir: boolean;
  setShowRir: (value: boolean) => void;
  appearance: Appearance;
  // Applies a palette and/or mode at once (the <html> data attributes drive app/themes.css).
  setAppearance: (value: Partial<Appearance>) => void;
};

// Display preferences of the signed-in user (loaded by the root layout, changed in the account menu).
// Without a provider (signed out) everything shows in the default palette.
const PreferencesContext = createContext<Preferences>({
  showRir: true,
  setShowRir: () => undefined,
  appearance: { palette: DEFAULT_PALETTE, colorMode: DEFAULT_COLOR_MODE },
  setAppearance: () => undefined,
});

type ProviderProps = { initialShowRir: boolean; initialAppearance: Appearance; children: ReactNode };

export function PreferencesProvider({ initialShowRir, initialAppearance, children }: ProviderProps) {
  const [showRir, setShowRir] = useState(initialShowRir);
  const [appearance, setAppearanceState] = useState(initialAppearance);

  const setAppearance = useCallback((value: Partial<Appearance>) => {
    setAppearanceState((current) => {
      const next = { ...current, ...value };
      document.documentElement.dataset.palette = next.palette;
      document.documentElement.dataset.mode = next.colorMode;
      return next;
    });
  }, []);

  const value = useMemo(() => ({ showRir, setShowRir, appearance, setAppearance }), [showRir, appearance, setAppearance]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Preferences {
  return useContext(PreferencesContext);
}
