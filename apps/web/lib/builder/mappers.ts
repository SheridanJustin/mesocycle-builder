import type { MesocycleDetail, PutScheduleSchema } from '@mesocycle/shared';
import type { z } from 'zod';
import { newId } from './ids';
import type { BuilderState } from './types';

export type ScheduleBody = z.input<typeof PutScheduleSchema>;

export function detailToState(detail: MesocycleDetail): BuilderState {
  return {
    days: detail.days.map((day) => ({
      id: newId(),
      name: day.day_name,
      weekday: day.weekday,
      muscles: day.muscle_groups.map((g) => g.muscle),
      slots: day.slots.map((slot) => ({
        id: newId(),
        muscle: slot.muscle,
        exercise: slot.exercise,
        sets: slot.target_sets,
        repMin: slot.rep_range_min,
        repMax: slot.rep_range_max,
        rir: slot.target_rir,
        weight: slot.starting_weight,
      })),
    })),
    priorities: Object.fromEntries(detail.priorities.map((p) => [p.muscle, p.priority])),
  };
}

// Order in the arrays becomes sort_order (1-based), so the server stores exactly what the user sees.
export function stateToSchedule(state: BuilderState): ScheduleBody {
  return {
    days: state.days.map((day, dayIndex) => ({
      day_number: dayIndex + 1,
      weekday: day.weekday,
      day_name: day.name,
      sort_order: dayIndex + 1,
      muscle_groups: day.muscles.map((muscle, index) => ({ muscle, sort_order: index + 1 })),
      slots: day.slots.map((slot, index) => ({
        client_id: slot.id,
        muscle: slot.muscle,
        exercise_id: slot.exercise.id,
        sort_order: index + 1,
        target_sets: slot.sets,
        rep_range_min: slot.repMin,
        rep_range_max: slot.repMax,
        target_rir: slot.rir,
        starting_weight: slot.weight,
      })),
    })),
    priorities: Object.entries(state.priorities).flatMap(([muscle, priority]) =>
      priority ? [{ muscle: muscle as keyof BuilderState['priorities'] & string, priority }] : [],
    ) as ScheduleBody['priorities'],
  };
}
