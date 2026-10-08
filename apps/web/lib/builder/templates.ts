import { WEEK_DAYS, type Exercise, type MesocycleTemplate } from '@mesocycle/shared';
import { autoDayName } from '../days';
import { newId } from './ids';
import { relabel } from './reducer';
import type { BuilderState } from './types';

export type TemplateResult = { state: BuilderState; missing: string[] };

// Builds a board from a template. Exercises are matched by name against the catalog (built-in
// exercises win over custom ones with the same name); names that are not found are skipped and reported.
export function templateToState(template: MesocycleTemplate, catalog: readonly Exercise[], makeId: () => string = newId): TemplateResult {
  const byName = new Map<string, Exercise>();
  for (const exercise of catalog) {
    const current = byName.get(exercise.name);
    if (!current || (current.is_custom && !exercise.is_custom)) byName.set(exercise.name, exercise);
  }
  const missing = new Set<string>();
  const mode = template.mode === 'calendar' && template.days.length === WEEK_DAYS ? 'calendar' : 'relative';
  const state: BuilderState = {
    mode,
    priorities: {},
    days: template.days.map((slots, index) => ({
      id: makeId(),
      name: autoDayName(mode, index),
      weekday: null,
      slots: slots.flatMap((slot) => {
        const exercise = byName.get(slot.exercise);
        if (!exercise) {
          missing.add(slot.exercise);
          return [];
        }
        return [
          {
            id: makeId(),
            muscle: exercise.primary_muscle,
            exercise,
            sets: slot.sets,
            repMin: slot.repMin,
            repMax: slot.repMax,
            rir: slot.rir,
            weight: null,
          },
        ];
      }),
    })),
  };
  return { state: relabel(state), missing: [...missing] };
}
