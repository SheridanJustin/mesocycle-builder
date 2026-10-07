import { MAX_RIR, MAX_SETS, MIN_RIR, MIN_SETS, MUSCLE_GROUP_OF } from '@mesocycle/shared';
import type { BuilderSlot, SlotMetrics } from '../../lib/builder/types';
import { equipmentLabel, groupLabel } from '../../lib/labels';
import { usePreferences } from '../preferences/PreferencesContext';
import { NumberStepper } from '../ui/NumberStepper';
import { GROUP_DOT } from './group-colors';
import { RepRangeField } from './RepRangeField';

type Props = {
  slot: BuilderSlot;
  onUpdate: (patch: Partial<SlotMetrics>) => void;
  onRemove: () => void;
};

const fieldLabel = 'text-[10px] font-semibold uppercase tracking-wider text-graphite-400';

export function ExerciseCard({ slot, onUpdate, onRemove }: Props) {
  const { exercise } = slot;
  const group = MUSCLE_GROUP_OF[slot.muscle];
  // RIR can be switched off in the account menu; the value is kept, just not shown.
  const { showRir } = usePreferences();

  return (
    <article
      aria-label={exercise.name}
      data-testid="exercise-card"
      className="rounded-xl border border-graphite-700/80 bg-graphite-800/70 p-2 shadow-sm transition-colors hover:border-graphite-600"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${GROUP_DOT[group]}`} />
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold leading-snug">{exercise.name}</h4>
          <p className="text-[11px] text-graphite-400">
            <span data-testid="muscle-tag" className="font-medium text-graphite-200">
              {groupLabel(group)}
            </span>
            {' · '}
            {equipmentLabel(exercise.equipment_type)}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Delete ${exercise.name}`}
          onClick={onRemove}
          className="-mr-1 -mt-1 rounded-md px-1.5 py-0.5 text-graphite-500 hover:bg-snow-900 hover:text-snow-200"
        >
          ✕
        </button>
      </div>

      <div className={`mt-2 grid items-start gap-x-1.5 ${showRir ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[auto_1fr]'}`}>
        <div className="grid gap-0.5">
          <span className={fieldLabel}>Sets</span>
          <NumberStepper label="Sets" value={slot.sets} min={MIN_SETS} max={MAX_SETS} onChange={(sets) => onUpdate({ sets })} />
        </div>
        <RepRangeField idPrefix={slot.id} min={slot.repMin} max={slot.repMax} onChange={(repMin, repMax) => onUpdate({ repMin, repMax })} />
        {showRir && (
        <div className="grid gap-0.5">
          <label htmlFor={`${slot.id}-rir`} className={fieldLabel}>
            RIR
          </label>
          <select
            id={`${slot.id}-rir`}
            className="h-7 w-11 rounded-md border border-graphite-700 bg-graphite-950 px-1 text-sm text-graphite-50"
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
        )}
      </div>
    </article>
  );
}
