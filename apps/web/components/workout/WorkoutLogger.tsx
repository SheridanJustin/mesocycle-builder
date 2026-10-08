'use client';

import type { WorkoutDetail, WorkoutExercise } from '@mesocycle/shared';
import Link from 'next/link';
import { formatIsoDate } from '../../lib/dates';
import type { Draft, SetRow } from '../../lib/workout-entry';
import { Button } from '../ui/Button';
import { ExerciseLog, type RowError } from './ExerciseLog';

type Props = {
  workout: WorkoutDetail;
  unit: string;
  showRir: boolean;
  extraRows: Readonly<Record<string, number>>;
  drafts: Readonly<Record<string, Draft>>;
  pending: ReadonlySet<string>;
  errors: Readonly<Record<string, RowError>>;
  error: string | null;
  finishing: boolean;
  onChange: (key: string, field: keyof Draft, value: string) => void;
  onToggle: (item: WorkoutExercise, row: SetRow) => void;
  onCommit: (item: WorkoutExercise, row: SetRow) => void;
  onAddSet: (itemId: string) => void;
  onRemoveSet: (itemId: string) => void;
  onFinish: () => void;
};

function lockedReason(workout: WorkoutDetail): string {
  if (workout.status === 'skipped') return 'You skipped this workout. Undo the skip on the plan to log it.';
  if (workout.mesocycle.status === 'paused') return 'This mesocycle is paused. Resume it to log workouts.';
  return `This mesocycle is ${workout.mesocycle.status}; its workouts are read-only.`;
}

// The workout logger (SPEC decision 19): every exercise with a row per set. Placeholders are the
// previous workout's numbers, so ✓ on an empty row repeats them.
export function WorkoutLogger({ workout, unit, showRir, extraRows, drafts, pending, errors, error, finishing, onFinish, ...handlers }: Props) {
  const logged = workout.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const records = workout.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.records.length > 0).length, 0);
  const planHref = `/mesocycles/${workout.mesocycle.id}`;

  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 pb-6 pt-5">
        <Link href={planHref} className="text-sm text-graphite-400 hover:text-aqua-300">
          ← {workout.mesocycle.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{workout.day_name}</h1>
          <p className="text-sm text-graphite-400" data-testid="workout-meta">
            Week {workout.week_number}
            {workout.is_deload ? ' · Deload' : ''}
            {workout.scheduled_date ? ` · ${formatIsoDate(workout.scheduled_date, 'short')}` : ''}
          </p>
        </div>
        <p className="mt-1 text-sm text-graphite-400">
          Tap ✓ to log a set. Leave a field empty to repeat last workout&apos;s numbers (the grey placeholders).
        </p>

        {!workout.editable && (
          <p role="status" className="mt-3 rounded-xl border border-graphite-700 bg-graphite-900 p-3 text-sm text-graphite-200">
            {lockedReason(workout)}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
            {error}
          </p>
        )}

        <div className="mt-4 grid gap-3">
          {workout.exercises.map((item, index) => (
            <ExerciseLog
              key={item.id}
              item={item}
              index={index}
              unit={unit}
              showRir={showRir}
              editable={workout.editable}
              extraRows={extraRows[item.id] ?? 0}
              drafts={drafts}
              pending={pending}
              errors={errors}
              {...handlers}
            />
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-graphite-800 bg-graphite-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm text-graphite-300" data-testid="workout-summary">
            {logged} {logged === 1 ? 'set' : 'sets'} logged
            {records > 0 ? ` · ${records} ${records === 1 ? 'PR' : 'PRs'}` : ''}
          </p>
          {workout.status === 'completed' ? (
            <span className="flex items-center gap-3">
              <span data-testid="workout-status" className="rounded-full bg-shamrock-950 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-shamrock-300 ring-1 ring-shamrock-800">
                ✓ Completed
              </span>
              <Link href={planHref} className="text-sm font-medium text-aqua-300 hover:underline">
                Back to plan
              </Link>
            </span>
          ) : (
            workout.editable && (
              <Button variant="primary" disabled={finishing || pending.size > 0} onClick={onFinish}>
                {finishing ? 'Finishing…' : 'Finish workout'}
              </Button>
            )
          )}
        </div>
      </div>
    </main>
  );
}
