'use client';

import type { KeyboardEvent } from 'react';
import { formatSet, formatWeight, RECORD_LABEL, type Draft, type SetRow } from '../../lib/workout-entry';

type Props = {
  // Part of every control's name, so "set 1" of each exercise is told apart.
  exerciseName: string;
  row: SetRow;
  draft: Draft | undefined;
  placeholder: Draft;
  unit: string;
  editable: boolean;
  busy: boolean;
  error: { field: 'weight' | 'reps'; message: string } | null;
  onChange: (field: keyof Draft, value: string) => void;
  // ✓: logs the set (typed numbers, or the placeholders), or un-logs a logged one.
  onToggle: () => void;
  // Leaving a field of a logged set saves the correction.
  onCommit: () => void;
  onRemove: () => void;
};

export const SET_GRID = 'grid grid-cols-[1.5rem_minmax(0,1fr)_4.25rem_3.25rem_2.25rem] items-center gap-1.5';

const field =
  'h-9 w-full min-w-0 rounded-lg border bg-graphite-950 px-1.5 text-center text-sm tabular-nums text-graphite-50 placeholder:text-graphite-400 disabled:opacity-60';

// One set of an exercise: previous result, weight, reps and ✓ (SPEC decision 19).
export function SetRowView({ exerciseName, row, draft, placeholder, unit, editable, busy, error, onChange, onToggle, onCommit, onRemove }: Props) {
  const { logged, setNumber } = row;
  const value = (key: keyof Draft): string => {
    if (draft) return draft[key];
    if (!logged) return '';
    if (key === 'reps') return String(logged.reps);
    return logged.weight !== null && logged.weight > 0 ? formatWeight(logged.weight) : 'BW';
  };
  const records = logged?.records ?? [];
  const errorId = `set-error-${exerciseName.replace(/\W+/g, '-')}-${setNumber}`;

  const onKeyDown = (key: keyof Draft) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (key === 'weight') {
      (event.currentTarget.parentElement?.querySelector('input[data-field="reps"]') as HTMLInputElement | null)?.focus();
    } else if (logged) {
      event.currentTarget.blur();
    } else {
      onToggle();
    }
  };

  const input = (key: keyof Draft, label: string, inputMode: 'decimal' | 'numeric') => (
    <input
      data-field={key}
      aria-label={`${exerciseName} set ${setNumber} ${label}`}
      aria-invalid={error?.field === key || undefined}
      aria-describedby={error?.field === key ? errorId : undefined}
      inputMode={inputMode}
      enterKeyHint={key === 'weight' ? 'next' : 'done'}
      autoComplete="off"
      disabled={!editable}
      value={value(key)}
      placeholder={placeholder[key]}
      onChange={(e) => onChange(key, e.target.value)}
      onBlur={() => logged && draft && onCommit()}
      onKeyDown={onKeyDown(key)}
      className={`${field} ${error?.field === key ? 'border-snow-500' : logged ? 'border-shamrock-800' : 'border-graphite-700'}`}
    />
  );

  return (
    <li data-testid="set-row" data-logged={logged !== null} className="rounded-lg">
      <div className={`${SET_GRID} rounded-lg px-1 py-0.5 ${logged ? 'bg-shamrock-950/50' : ''}`}>
        <span className="text-center text-sm font-semibold tabular-nums text-graphite-300">{setNumber}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs tabular-nums text-graphite-400">
          {records.length > 0 ? (
            <span
              data-testid="pr-badge"
              title={`New personal record: ${records.map((r) => RECORD_LABEL[r]).join(', ')}`}
              className="shrink-0 rounded-full bg-aqua-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-graphite-950"
            >
              PR<span className="sr-only">: {records.map((r) => RECORD_LABEL[r]).join(', ')}</span>
            </span>
          ) : null}
          <span className="truncate" data-testid="set-previous">
            {row.previous ? formatSet(row.previous) : '—'}
          </span>
          {row.removable && editable && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${exerciseName} set ${setNumber}`}
              className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-md text-graphite-400 hover:bg-graphite-800 hover:text-graphite-100"
            >
              ✕
            </button>
          )}
        </span>
        {input('weight', `weight (${unit})`, 'decimal')}
        {input('reps', 'reps', 'numeric')}
        <button
          type="button"
          aria-label={logged ? `${exerciseName} set ${setNumber} logged, tap to undo` : `Log ${exerciseName} set ${setNumber}`}
          aria-pressed={logged !== null}
          disabled={!editable || busy}
          onClick={onToggle}
          className={`grid h-9 w-9 place-items-center rounded-lg border text-base font-bold transition-colors disabled:opacity-60 ${
            logged
              ? 'border-shamrock-500 bg-shamrock-500 text-graphite-950 hover:bg-shamrock-400'
              : 'border-graphite-600 bg-graphite-900 text-graphite-400 hover:border-shamrock-500 hover:text-shamrock-300'
          }`}
        >
          ✓
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="px-1 pt-0.5 text-right text-xs text-snow-300">
          {error.message}
        </p>
      )}
    </li>
  );
}
