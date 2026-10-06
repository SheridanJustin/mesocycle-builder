import { expect, type APIRequestContext } from '@playwright/test';

export type SlotSpec = { exercise: string; sets?: number; repMin?: number; repMax?: number; rir?: number; weight?: number | null };
export type DaySpec = { name?: string; slots?: SlotSpec[] };

async function exerciseByName(request: APIRequestContext, name: string): Promise<{ id: string; primary_muscle: string }> {
  const response = await request.get(`/api/v1/exercises?search=${encodeURIComponent(name)}&limit=20`);
  expect(response.ok()).toBe(true);
  const { items } = (await response.json()) as { items: { id: string; name: string; primary_muscle: string }[] };
  const match = items.find((item) => item.name === name);
  if (!match) throw new Error(`Exercise not found: ${name}`);
  return match;
}

// Creates a draft and fills its schedule through the API, so tests can start from a populated board.
// Seven days use Mon-Sun names unless `numbered` is set; any other count is numbered.
export async function createPopulatedDraft(
  request: APIRequestContext,
  opts: { name: string; days: DaySpec[]; numbered?: boolean },
): Promise<string> {
  const mode = opts.days.length === 7 && !opts.numbered ? 'calendar' : 'relative';
  const created = await request.post('/api/v1/mesocycles', {
    data: { name: opts.name, days_per_week: opts.days.length, schedule_mode: mode },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const days = [];
  for (const [dayIndex, day] of opts.days.entries()) {
    const slots = [];
    const muscles: string[] = [];
    for (const [slotIndex, slot] of (day.slots ?? []).entries()) {
      const exercise = await exerciseByName(request, slot.exercise);
      if (!muscles.includes(exercise.primary_muscle)) muscles.push(exercise.primary_muscle);
      slots.push({
        client_id: `s-${dayIndex}-${slotIndex}`,
        muscle: exercise.primary_muscle,
        exercise_id: exercise.id,
        sort_order: slotIndex + 1,
        target_sets: slot.sets ?? 3,
        rep_range_min: slot.repMin ?? 8,
        rep_range_max: slot.repMax ?? 12,
        target_rir: slot.rir ?? 3,
        starting_weight: slot.weight ?? null,
      });
    }
    days.push({
      day_number: dayIndex + 1,
      weekday: mode === 'calendar' ? dayIndex : null,
      day_name: day.name ?? (mode === 'calendar' ? weekdayNames[dayIndex] : `Day ${dayIndex + 1}`),
      sort_order: dayIndex + 1,
      muscle_groups: muscles.map((muscle, i) => ({ muscle, sort_order: i + 1 })),
      slots,
    });
  }
  const saved = await request.put(`/api/v1/mesocycles/${id}/schedule`, { data: { schedule_mode: mode, days } });
  expect(saved.ok()).toBe(true);
  return id;
}
