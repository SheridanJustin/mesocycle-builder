import { MAX_RIR, MAX_SETS, MIN_RIR, MIN_SETS } from '@mesocycle/shared';
import type { ReactNode } from 'react';
import type { BuilderSlot, SlotMetrics } from '../../lib/builder/types';
import { equipmentLabel, muscleLabel } from '../../lib/labels';
import { Button } from '../ui/Button';
import { NumberStepper } from '../ui/NumberStepper';
import { RepRangeField } from './RepRangeField';
import { WeightField } from './WeightField';

type Props = {
  slot: BuilderSlot;
  isFirst: boolean;
  isLast: boolean;
  weightUnit: string;
  // Rendered in the header; the sortable wrapper passes the drag handle here.
  dragHandle?: ReactNode;
  onUpdate: (patch: Partial<SlotMetrics>) => void;
  onStep: (direction: 'up' | 'down') => void;
  onRemove: () => void;
};

export function ExerciseCard({ slot, isFirst, isLast, weightUnit, dragHandle, onUpdate, onStep, onRemove }: Props) {
  const { exercise } = slot;

  return (
    <article aria-label={exercise.name} data-testid="exercise-card" className="rounded-lg border border-graphite-700 bg-graphite-800 p-3 shadow-sm">
      <div className="flex items-start gap-2">
        {dragHandle}
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold leading-snug">{exercise.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-xs">
            <span data-testid="muscle-tag" className="rounded-full bg-aqua-900 px-2 py-0.5 font-medium text-aqua-100">
              {muscleLabel(slot.muscle)}
            </span>
            <span className="rounded-full bg-graphite-700 px-2 py-0.5 text-graphite-100">{equipmentLabel(exercise.equipment_type)}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <div className="grid gap-1">
          <span className="text-xs font-medium text-graphite-300">Sets</span>
          <NumberStepper label="Sets" value={slot.sets} min={MIN_SETS} max={MAX_SETS} onChange={(sets) => onUpdate({ sets })} />
        </div>
        <RepRangeField idPrefix={slot.id} min={slot.repMin} max={slot.repMax} onChange={(repMin, repMax) => onUpdate({ repMin, repMax })} />
        <div className="grid gap-1">
          <label htmlFor={`${slot.id}-rir`} className="text-xs font-medium text-graphite-300">
            RIR
          </label>
          <select
            id={`${slot.id}-rir`}
            className="w-16 rounded border border-graphite-700 bg-graphite-950 px-1.5 py-1 text-sm text-graphite-50"
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

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-graphite-700 pt-2">
        <Button size="sm" variant="ghost" aria-label={`Move ${exercise.name} up`} disabled={isFirst} onClick={() => onStep('up')}>
          ↑
        </Button>
        <Button size="sm" variant="ghost" aria-label={`Move ${exercise.name} down`} disabled={isLast} onClick={() => onStep('down')}>
          ↓
        </Button>
        <Button size="sm" variant="ghost" className="ml-auto text-snow-300" aria-label={`Delete ${exercise.name}`} onClick={onRemove}>
          Delete
        </Button>
      </div>
    </article>
  );
}
