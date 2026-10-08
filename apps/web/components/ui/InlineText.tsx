'use client';

import { useState } from 'react';

type Props = {
  value: string;
  onCommit: (value: string) => void;
  ariaLabel: string;
  maxLength?: number;
  className?: string;
  id?: string;
  testId?: string;
  // Shows the full value on hover when it does not fit.
  title?: string;
  // Sizes the field to its text (an invisible copy of the text sets the width), so a container
  // sized to its content grows with the value. The wrapper takes wrapperClassName.
  autoSize?: boolean;
  wrapperClassName?: string;
};

// Edits a draft locally and commits on blur/Enter. Blank values are rejected (the draft reverts),
// so an invalid name never reaches autosave.
export function InlineText({ value, onCommit, ariaLabel, maxLength = 50, className = '', id, testId, title, autoSize = false, wrapperClassName = '' }: Props) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    const next = (draft ?? value).trim();
    setDraft(null);
    if (next.length > 0 && next !== value) onCommit(next);
  }

  const box = 'rounded-md border border-transparent px-2 py-1';
  const field = (
    <input
      id={id}
      data-testid={testId}
      title={title}
      // Zero intrinsic width: only the text copy sizes the field; it then stretches to fill it.
      style={autoSize ? { width: 0, minWidth: '100%' } : undefined}
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
      className={`${box} bg-transparent text-graphite-50 hover:border-graphite-700 focus:border-aqua-500 focus:bg-graphite-950 ${autoSize ? 'col-start-1 row-start-1' : ''} ${className}`}
    />
  );
  if (!autoSize) return field;
  return (
    <span className={`inline-grid ${wrapperClassName}`}>
      <span aria-hidden="true" className={`invisible col-start-1 row-start-1 overflow-hidden whitespace-pre ${box} ${className}`}>
        {draft ?? value}
      </span>
      {field}
    </span>
  );
}
