import { expect, type APIRequestContext } from '@playwright/test';

export type SlotSpec = {
  muscle: string;
  exercise: string;
  sets?: number;
  repMin?: number;
  repMax?: number;
  rir?: number;
  weight?: number | null;
};
export type DaySpec = { name: string; muscles: string[]; slots?: SlotSpec[] };

async function exerciseIdByName(request: APIRequestContext, name: string): Promise<string> {
  const response = await request.get(`/api/v1/exercises?search=${encodeURIComponent(name)}&limit=20`);
  expect(response.ok()).toBe(true);
  const { items } = (await response.json()) as { items: { id: string; name: string }[] };
  const match = items.find((item) => item.name === name);
  if (!match) throw new Error(`Exercise not found: ${name}`);
  return match.id;
}

// Creates a draft mesocycle and fills its schedule through the API, so tests can start from a
// populated board without clicking through the whole wizard.
export async function createPopulatedDraft(
  request: APIRequestContext,
  opts: { name: string; days: DaySpec[]; priorities?: { muscle: string; priority: string }[] },
): Promise<string> {
  const created = await request.post('/api/v1/mesocycles', {
    data: { name: opts.name, days_per_week: Math.min(Math.max(opts.days.length, 2), 6) },
  });
  expect(created.ok()).toBe(true);
  const { id } = (await created.json()) as { id: string };

  const days = [];
  for (const [dayIndex, day] of opts.days.entries()) {
    const slots = [];
    for (const [slotIndex, slot] of (day.slots ?? []).entries()) {
      slots.push({
        client_id: `s-${dayIndex}-${slotIndex}`,
        muscle: slot.muscle,
        exercise_id: await exerciseIdByName(request, slot.exercise),
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
      weekday: null,
      day_name: day.name,
      sort_order: dayIndex + 1,
      muscle_groups: day.muscles.map((muscle, i) => ({ muscle, sort_order: i + 1 })),
      slots,
    });
  }
  const saved = await request.put(`/api/v1/mesocycles/${id}/schedule`, { data: { days, priorities: opts.priorities ?? [] } });
  expect(saved.ok()).toBe(true);
  return id;
}
