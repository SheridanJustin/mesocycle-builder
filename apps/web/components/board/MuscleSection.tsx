'use client';

import type { Muscle, Priority } from '@mesocycle/shared';
import { useState, type ReactNode } from 'react';
import { muscleLabel, priorityLabel } from '../../lib/labels';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';

type Props = {
  muscle: Muscle;
  priority: Priority;
  slotCount: number;
  // The cards (already rendered by the board, possibly inside a sortable context).
  children: ReactNode;
  onAddExercise: () => void;
  onRemove: () => void;
};

const PRIORITY_STYLE: Record<Priority, string> = {
  focus: 'bg-blue-700 text-white',
  normal: 'bg-slate-200 text-slate-900',
  maintenance: 'bg-slate-100 text-slate-800 border border-slate-300',
};

export function MuscleSection({ muscle, priority, slotCount, children, onAddExercise, onRemove }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section aria-label={`${muscleLabel(muscle)} section`} className="grid gap-2">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{muscleLabel(muscle)}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[priority]}`}>{priorityLabel(priority)}</span>
        <div className="ml-auto flex items-center gap-1">
          <Button size="sm" aria-label={`Add exercise to ${muscleLabel(muscle)}`} onClick={onAddExercise}>
            + Add exercise
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Remove ${muscleLabel(muscle)} section`}
            onClick={() => (slotCount === 0 ? onRemove() : setConfirming(true))}
          >
            ✕
          </Button>
        </div>
      </header>
      {slotCount === 0 && <p className="rounded border border-dashed border-slate-300 p-3 text-center text-xs text-slate-600">No exercises yet.</p>}
      <div className="grid gap-2">{children}</div>
      <ConfirmDialog
        open={confirming}
        title="Remove muscle group?"
        message={`Removing ${muscleLabel(muscle)} also removes its ${slotCount} exercise(s) from this day.`}
        confirmLabel="Remove"
        onConfirm={() => {
          setConfirming(false);
          onRemove();
        }}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
