import { WEEK_DAYS, type MesocycleDetail, type Muscle, type PutScheduleSchema } from '@mesocycle/shared';
import type { z } from 'zod';
import { newId } from './ids';
import type { BuilderState } from './types';

export type ScheduleBody = z.input<typeof PutScheduleSchema>;

export function detailToState(detail: MesocycleDetail): BuilderState {
  // Weekday names need a full 7-day week; anything else is shown as numbered days.
  const mode = detail.schedule_mode === 'calendar' && detail.days.length === WEEK_DAYS ? 'calendar' : 'relative';
  return {
    mode,
    days: detail.days.map((day, index) => ({
      id: newId(),
      name: day.day_name,
      weekday: mode === 'calendar' ? index : null,
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

// Array order becomes sort_order (1-based), so the server stores exactly what the user sees.
// Muscle groups are not edited in the UI: each day gets one per muscle it trains, in order of appearance.
export function stateToSchedule(state: BuilderState): ScheduleBody {
  return {
    schedule_mode: state.mode,
    days: state.days.map((day, dayIndex) => {
      const muscles = [...new Set<Muscle>(day.slots.map((slot) => slot.muscle))];
      return {
        day_number: dayIndex + 1,
        weekday: state.mode === 'calendar' ? dayIndex : null,
        day_name: day.name,
        sort_order: dayIndex + 1,
        muscle_groups: muscles.map((muscle, index) => ({ muscle, sort_order: index + 1 })),
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
      };
    }),
    priorities: Object.entries(state.priorities).flatMap(([muscle, priority]) =>
      priority ? [{ muscle: muscle as Muscle, priority }] : [],
    ),
  };
}
