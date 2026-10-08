'use client';

import type { WorkoutExercise } from '@mesocycle/shared';
import { equipmentLabel, muscleLabel } from '../../lib/labels';
import { formatSet, placeholders, setRows, type Draft, type SetRow } from '../../lib/workout-entry';
import { SET_GRID, SetRowView } from './SetRowView';

export type RowError = { field: 'weight' | 'reps'; message: string };

type Props = {
  item: WorkoutExercise;
  index: number;
  unit: string;
  showRir: boolean;
  editable: boolean;
  // After a set was added or removed: where the change carried over to (SPEC decision 20).
  notice: string | null;
  drafts: Readonly<Record<string, Draft>>;
  pending: ReadonlySet<string>;
  errors: Readonly<Record<string, RowError>>;
  onChange: (key: string, field: keyof Draft, value: string) => void;
  onToggle: (item: WorkoutExercise, row: SetRow) => void;
  onCommit: (item: WorkoutExercise, row: SetRow) => void;
  onAddSet: (item: WorkoutExercise) => void;
  onRemoveSet: (item: WorkoutExercise, row: SetRow) => void;
};

export const rowKey = (itemId: string, setNumber: number) => `${itemId}:${setNumber}`;

// One exercise of a workout: its target, previous best and a row per set.
export function ExerciseLog({ item, index, unit, showRir, editable, notice, drafts, pending, errors, onChange, onToggle, onCommit, onAddSet, onRemoveSet }: Props) {
  const rows = setRows(item);
  const done = item.sets.length;
  const headingId = `exercise-${item.id}`;
  return (
    <section aria-labelledby={headingId} data-testid="exercise-log" className="rounded-2xl border border-graphite-800 bg-graphite-900/80 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-semibold text-graphite-50">
            <span className="mr-1.5 text-graphite-400">{index + 1}.</span>
            {item.exercise.name}
          </h2>
          <p className="mt-0.5 text-xs text-graphite-400">
            {muscleLabel(item.exercise.primary_muscle)} · {equipmentLabel(item.exercise.equipment_type)} · Target {item.target_sets} × {item.rep_range_min}–{item.rep_range_max}
            {showRir ? ` · RIR ${item.target_rir}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right text-xs">
          <p className="tabular-nums text-graphite-300" data-testid="exercise-progress">
            {done}/{rows.length} sets
          </p>
          {item.best && (
            <p className="text-graphite-400" data-testid="exercise-best" title="Your best set before this workout">
              Best {formatSet(item.best)}
            </p>
          )}
        </div>
      </div>

      <div className={`${SET_GRID} mt-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-graphite-400`} aria-hidden="true">
        <span className="text-center">Set</span>
        <span>Previous</span>
        <span className="text-center">{unit}</span>
        <span className="text-center">Reps</span>
        <span className="text-center">✓</span>
      </div>
      <ol className="mt-1 grid gap-1">
        {rows.map((row) => {
          const key = rowKey(item.id, row.setNumber);
          return (
            <SetRowView
              key={key}
              exerciseName={item.exercise.name}
              row={row}
              draft={drafts[key]}
              placeholder={placeholders(row, item)}
              unit={unit}
              editable={editable}
              busy={pending.has(key)}
              error={errors[key] ?? null}
              onChange={(field, value) => onChange(key, field, value)}
              onToggle={() => onToggle(item, row)}
              onCommit={() => onCommit(item, row)}
              onRemove={() => onRemoveSet(item, row)}
            />
          );
        })}
      </ol>
      {editable && rows.length < 20 && (
        <button
          type="button"
          disabled={pending.has(`${item.id}:sets`)}
          onClick={() => onAddSet(item)}
          className="mt-2 w-full rounded-lg border border-dashed border-graphite-700 py-1.5 text-sm font-medium text-graphite-300 hover:border-aqua-500 hover:text-aqua-300 disabled:opacity-60"
        >
          <span aria-hidden="true">+</span> Add set<span className="sr-only"> to {item.exercise.name}</span>
        </button>
      )}
      {notice && (
        <p role="status" data-testid="sets-notice" className="mt-2 rounded-lg border border-verdigris-800 bg-verdigris-950 px-2.5 py-1.5 text-xs text-verdigris-200">
          {notice}
        </p>
      )}
    </section>
  );
}
