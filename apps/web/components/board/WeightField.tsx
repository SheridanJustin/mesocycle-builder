'use client';

import { useState } from 'react';
import { parseWeight } from '../../lib/builder/rep-ranges';

type Props = { idPrefix: string; value: number | null; unit: string; onChange: (value: number | null) => void };

// Optional starting weight. Invalid text stays local (with an error) until it parses.
export function WeightField({ idPrefix, value, unit, onChange }: Props) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (value === null ? '' : String(value));
  const parsed = parseWeight(text);

  return (
    <div className="grid gap-1">
      <label htmlFor={`${idPrefix}-weight`} className="text-xs font-medium text-graphite-300">
        Weight ({unit})
      </label>
      <input
        id={`${idPrefix}-weight`}
        inputMode="decimal"
        placeholder="optional"
        aria-invalid={!parsed.ok}
        className="w-24 rounded border border-graphite-700 bg-graphite-950 px-1.5 py-1 text-sm text-graphite-50"
        value={text}
        onChange={(e) => {
          const next = parseWeight(e.target.value);
          if (next.ok) {
            setDraft(null);
            onChange(next.value);
          } else {
            setDraft(e.target.value);
          }
        }}
        onBlur={() => setDraft(null)}
      />
      {!parsed.ok && (
        <p role="alert" className="text-xs text-snow-300">
          {parsed.error}
        </p>
      )}
    </div>
  );
}
