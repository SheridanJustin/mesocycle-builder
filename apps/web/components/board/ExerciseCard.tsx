import { MAX_RIR, MAX_SETS, MIN_RIR, MIN_SETS } from '@mesocycle/shared';
import type { ReactNode } from 'react';
import type { BuilderSlot, SlotMetrics } from '../../lib/builder/types';
import { equipmentLabel, muscleLabel } from '../../lib/labels';
import { Button } from '../ui/Button';
import { NumberStepper } from '../ui/NumberStepper';
import { RepRangeField } from './RepRangeField';
import { WeightField } from './WeightField';

export type DayOption = { id: string; name: string };

type Props = {
  slot: BuilderSlot;
  isFirst: boolean;
  isLast: boolean;
  // Other days this card can be moved to (keyboard alternative to dragging).
  otherDays: DayOption[];
  weightUnit: string;
  // Rendered in the header; the sortable wrapper passes the drag handle here.
  dragHandle?: ReactNode;
  onUpdate: (patch: Partial<SlotMetrics>) => void;
  onStep: (direction: 'up' | 'down') => void;
  onMoveToDay: (dayId: string) => void;
  onRemove: () => void;
};

export function ExerciseCard({ slot, isFirst, isLast, otherDays, weightUnit, dragHandle, onUpdate, onStep, onMoveToDay, onRemove }: Props) {
  const { exercise } = slot;
  const mismatch = exercise.primary_muscle !== slot.muscle;

  return (
    <article aria-label={exercise.name} data-testid="exercise-card" className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold leading-snug">{exercise.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
            <span className="rounded-full bg-slate-200 px-2 py-0.5 font-medium text-slate-900">{equipmentLabel(exercise.equipment_type)}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-800">{exercise.movement_type}</span>
          </div>
          {mismatch && (
            <p className="mt-1 text-xs text-amber-900" data-testid="muscle-mismatch">
              <span aria-hidden="true">⚠ </span>
              Primary muscle is {muscleLabel(exercise.primary_muscle)}, placed under {muscleLabel(slot.muscle)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-slate-700">Sets</span>
          <NumberStepper label="Sets" value={slot.sets} min={MIN_SETS} max={MAX_SETS} onChange={(sets) => onUpdate({ sets })} />
        </div>
        <RepRangeField idPrefix={slot.id} min={slot.repMin} max={slot.repMax} onChange={(repMin, repMax) => onUpdate({ repMin, repMax })} />
        <div className="grid gap-1">
          <label htmlFor={`${slot.id}-rir`} className="text-xs font-medium text-slate-700">
            RIR
          </label>
          <select
            id={`${slot.id}-rir`}
            className="w-16 rounded border border-slate-300 bg-white px-1.5 py-1 text-sm"
            value={slot.rir}
            onChange={(e) => onUpdate({ rir: Number(e.target.value) })}
          >
            {Array.from({ length: MAX_RIR - MIN_RIR + 1 }, (_, i) => MIN_RIR + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <WeightField idPrefix={slot.id} value={slot.weight} unit={weightUnit} onChange={(weight) => onUpdate({ weight })} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2">
        <Button size="sm" variant="ghost" aria-label={`Move ${exercise.name} up`} disabled={isFirst} onClick={() => onStep('up')}>
          ↑
        </Button>
        <Button size="sm" variant="ghost" aria-label={`Move ${exercise.name} down`} disabled={isLast} onClick={() => onStep('down')}>
          ↓
        </Button>
        {otherDays.length > 0 && (
          <select
            aria-label={`Move ${exercise.name} to day`}
            className="max-w-28 rounded border border-slate-300 bg-white px-1 py-1 text-xs"
            value=""
            onChange={(e) => e.target.value && onMoveToDay(e.target.value)}
          >
            <option value="">Move to day…</option>
            {otherDays.map((day) => (
              <option key={day.id} value={day.id}>
                {day.name}
              </option>
            ))}
          </select>
        )}
        <Button size="sm" variant="ghost" className="ml-auto text-red-800" aria-label={`Delete ${exercise.name}`} onClick={onRemove}>
          Delete
        </Button>
      </div>
    </article>
  );
}
