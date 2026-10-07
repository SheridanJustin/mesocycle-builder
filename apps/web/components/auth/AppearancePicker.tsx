import { paletteScales, PALETTES, type PaletteSpec } from '../../lib/themes/palettes';
import type { Appearance, ColorMode } from '../preferences/PreferencesContext';

type Props = { appearance: Appearance; onChange: (value: Partial<Appearance>) => void };

// Swatches show each palette in the mode it was designed for (computed once).
const SWATCHES = Object.fromEntries(
  PALETTES.map((p) => {
    const s = paletteScales(p, p.defaultMode);
    return [p.id, [s.graphite[950], s.graphite[800], s.aqua[500], s.verdigris[500], s.graphite[50]]];
  }),
) as Record<PaletteSpec['id'], string[]>;

const MODES: { id: ColorMode; label: string }[] = [
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

// Palette and light/dark mode. Picking a palette shows it in the mode it was designed for; the mode
// switch then flips between dark and light for any palette.
export function AppearancePicker({ appearance, onChange }: Props) {
  return (
    <div className="grid gap-2">
      <div role="radiogroup" aria-label="Mode" className="flex rounded-lg border border-graphite-700 bg-graphite-950 p-0.5">
        {MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            role="radio"
            aria-checked={appearance.colorMode === mode.id}
            onClick={() => onChange({ colorMode: mode.id })}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
              appearance.colorMode === mode.id ? 'bg-aqua-500 text-graphite-950' : 'text-graphite-300 hover:text-graphite-50'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <div role="radiogroup" aria-label="Color palette" className="grid grid-cols-2 gap-1.5">
        {PALETTES.map((palette) => {
          const selected = appearance.palette === palette.id;
          return (
            <button
              key={palette.id}
              type="button"
              role="radio"
              aria-checked={selected}
              title={palette.description}
              data-testid={`palette-${palette.id}`}
              onClick={() => onChange({ palette: palette.id, colorMode: palette.defaultMode })}
              className={`rounded-lg border p-1.5 text-left transition-colors ${
                selected ? 'border-aqua-500 bg-aqua-950/40' : 'border-graphite-700 hover:border-graphite-500'
              }`}
            >
              <span className="flex overflow-hidden rounded-md border border-graphite-700" aria-hidden="true">
                {SWATCHES[palette.id].map((color, i) => (
                  <span key={i} className="h-4 flex-1" style={{ background: color }} />
                ))}
              </span>
              <span className="mt-1 block truncate text-xs font-medium text-graphite-100">{palette.name}</span>
              <span className="block text-[10px] text-graphite-400">{palette.defaultMode === 'light' ? 'Light first' : 'Dark first'}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
