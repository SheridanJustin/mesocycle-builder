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
    <div className="col-span-3 grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0.5">
      <label htmlFor={`${idPrefix}-weight`} className="text-[10px] font-semibold uppercase tracking-wider text-graphite-400">
        Weight ({unit})
      </label>
      <input
        id={`${idPrefix}-weight`}
        inputMode="decimal"
        placeholder="optional"
        aria-invalid={!parsed.ok}
        className="h-7 w-full rounded-md border border-graphite-700 bg-graphite-950 px-2 text-sm text-graphite-50 placeholder:text-graphite-600"
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
        <p role="alert" className="col-span-2 text-xs text-snow-300">
          {parsed.error}
        </p>
      )}
    </div>
  );
}
