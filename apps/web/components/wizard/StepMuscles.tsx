'use client';

import { MUSCLES, PRIORITIES, type Muscle, type Priority } from '@mesocycle/shared';
import { useState } from 'react';
import { muscleLabel, priorityLabel } from '../../lib/labels';
import type { BuilderDay, BuilderState } from '../../lib/builder/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type Props = {
  days: BuilderDay[];
  priorities: BuilderState['priorities'];
  onAddMuscle: (dayId: string, muscle: Muscle) => void;
  onRemoveMuscle: (dayId: string, muscle: Muscle) => void;
  onSetPriority: (muscle: Muscle, priority: Priority) => void;
};

// Step 2: assign muscle groups to days and set a priority per muscle.
export function StepMuscles({ days, priorities, onAddMuscle, onRemoveMuscle, onSetPriority }: Props) {
  const [pending, setPending] = useState<{ day: BuilderDay; muscle: Muscle } | null>(null);
  const assigned = MUSCLES.filter((muscle) => days.some((day) => day.muscles.includes(muscle)));
  const pendingCount = pending ? pending.day.slots.filter((s) => s.muscle === pending.muscle).length : 0;

  function toggle(day: BuilderDay, muscle: Muscle) {
    if (!day.muscles.includes(muscle)) return onAddMuscle(day.id, muscle);
    if (day.slots.some((s) => s.muscle === muscle)) setPending({ day, muscle });
    else onRemoveMuscle(day.id, muscle);
  }

  return (
    <section aria-labelledby="step-muscles-title" className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
      <div>
        <h2 id="step-muscles-title" className="text-xl font-semibold">
          2. Muscles
        </h2>
        <p className="text-sm text-slate-600">Choose which muscle groups each day trains, then set a priority for each muscle.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {days.map((day) => (
          <fieldset key={day.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <legend className="px-1 font-medium">{day.name}</legend>
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map((muscle) => {
                const on = day.muscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${day.name}: ${muscleLabel(muscle)}`}
                    onClick={() => toggle(day, muscle)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      on ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    {on && <span aria-hidden="true">✓ </span>}
                    {muscleLabel(muscle)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-1 font-medium">Priorities</h3>
        <p className="mb-3 text-sm text-slate-600">
          Priority sets the volume target band shown on the volume bar. It defaults to Normal.
        </p>
        {assigned.length === 0 ? (
          <p className="text-sm text-slate-500">Assign a muscle to a day to set its priority.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {assigned.map((muscle) => (
              <li key={muscle} className="flex items-center justify-between gap-3">
                <label htmlFor={`priority-${muscle}`} className="text-sm">
                  {muscleLabel(muscle)}
                </label>
                <select
                  id={`priority-${muscle}`}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                  value={priorities[muscle] ?? 'normal'}
                  onChange={(e) => onSetPriority(muscle, e.target.value as Priority)}
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabel(priority)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Remove muscle group?"
        message={`Removing ${pending ? muscleLabel(pending.muscle) : ''} from ${pending?.day.name ?? ''} also removes its ${pendingCount} exercise(s).`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (pending) onRemoveMuscle(pending.day.id, pending.muscle);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
