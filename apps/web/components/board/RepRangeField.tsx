'use client';

import { useState } from 'react';
import { matchingPreset, presetLabel, repRangeError, REP_PRESETS } from '../../lib/builder/rep-ranges';

type Props = { idPrefix: string; min: number; max: number; onChange: (min: number, max: number) => void };

const input = 'w-14 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm';

// Preset dropdown with a "Custom" option that reveals min/max inputs. Invalid custom values stay
// in the local draft (with an inline error) and are never committed to the schedule.
export function RepRangeField({ idPrefix, min, max, onChange }: Props) {
  const [forceCustom, setForceCustom] = useState(false);
  const [draft, setDraft] = useState<{ min?: string; max?: string }>({});
  const custom = forceCustom || matchingPreset(min, max) === null;

  const minText = draft.min ?? String(min);
  const maxText = draft.max ?? String(max);
  const error = repRangeError(Number(minText), Number(maxText));

  function edit(next: { min?: string; max?: string }) {
    const merged = { min: next.min ?? minText, max: next.max ?? maxText };
    if (repRangeError(Number(merged.min), Number(merged.max)) === null) {
      setDraft({});
      onChange(Number(merged.min), Number(merged.max));
    } else {
      setDraft(merged);
    }
  }

  return (
    <div
      className="grid gap-1"
      // Drafts survive moving between the min and max inputs; they reset once focus leaves the group.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDraft({});
      }}
    >
      <label htmlFor={`${idPrefix}-reps`} className="text-xs font-medium text-slate-700">
        Reps
      </label>
      <select
        id={`${idPrefix}-reps`}
        className="rounded border border-slate-300 bg-white px-1.5 py-1 text-sm"
        value={custom ? 'custom' : presetLabel({ min, max })}
        onChange={(e) => {
          if (e.target.value === 'custom') return setForceCustom(true);
          const preset = REP_PRESETS.find((p) => presetLabel(p) === e.target.value);
          if (!preset) return;
          setForceCustom(false);
          setDraft({});
          onChange(preset.min, preset.max);
        }}
      >
        {REP_PRESETS.map((preset) => (
          <option key={presetLabel(preset)} value={presetLabel(preset)}>
            {presetLabel(preset)}
          </option>
        ))}
        <option value="custom">Custom</option>
      </select>
      {custom && (
        <div className="flex items-center gap-1">
          <input
            aria-label="Minimum reps"
            aria-invalid={error !== null}
            inputMode="numeric"
            className={input}
            value={minText}
            onChange={(e) => edit({ min: e.target.value })}
          />
          <span aria-hidden="true">–</span>
          <input
            aria-label="Maximum reps"
            aria-invalid={error !== null}
            inputMode="numeric"
            className={input}
            value={maxText}
            onChange={(e) => edit({ max: e.target.value })}
          />
        </div>
      )}
      {custom && error && (
        <p role="alert" className="text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
