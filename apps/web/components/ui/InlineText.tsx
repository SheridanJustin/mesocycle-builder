'use client';

import { useState } from 'react';

type Props = {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  maxLength?: number;
  className?: string;
  id?: string;
};

// Edits a draft locally and commits on blur/Enter. Blank values are rejected (the draft reverts),
// so an invalid name never reaches autosave.
export function InlineText({ value, onCommit, ariaLabel, maxLength = 50, className = '', id }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    const next = (draft ?? value).trim();
    setDraft(null);
    if (next.length > 0 && next !== value) onCommit(next);
  }

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      value={draft ?? value}
      maxLength={maxLength}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(null);
          e.currentTarget.blur();
        }
      }}
      className={`rounded-md border border-transparent bg-transparent px-2 py-1 text-graphite-50 hover:border-graphite-700 focus:border-aqua-500 focus:bg-graphite-950 ${className}`}
    />
  );
}
