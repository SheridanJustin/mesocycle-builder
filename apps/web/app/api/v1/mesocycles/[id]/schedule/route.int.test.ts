import { ApiErrorSchema, MesocycleDetailSchema, type MesocycleDetail } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../../lib/db';
import {
  cleanCustomData,
  ctx,
  dayBody,
  exerciseId,
  otherUserId,
  postJson,
  putJson,
  request,
  slotBody,
  withoutIds,
} from '../../../../../../test/helpers';
import { POST as createMesocycle } from '../../route';
import { GET } from '../route';
import { PUT } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

async function createDraft(overrides: Record<string, unknown> = {}): Promise<string> {
  const body = { name: 'Block', days_per_week: 3, schedule_mode: 'relative', ...overrides };
  return MesocycleDetailSchema.parse(await (await createMesocycle(postJson('/api/v1/mesocycles', body))).json()).id;
}

const put = (id: string, body: unknown) => PUT(putJson(`/api/v1/mesocycles/${id}/schedule`, body), ctx(id));

async function pushSchedule() {
  const bench = await exerciseId('Barbell Bench Press');
  const fly = await exerciseId('Cable Fly');
  const pushdown = await exerciseId('Cable Pushdown');
  return {
    days: [
      dayBody(
        1,
        ['chest', 'triceps'],
        [
          slotBody('a', 'chest', bench, 1, { target_sets: 4, rep_range_min: 6, rep_range_max: 10, target_rir: 2, starting_weight: 185.5 }),
          slotBody('b', 'triceps', pushdown, 2),
          slotBody('c', 'chest', fly, 3, { target_sets: 3 }),
        ],
        { day_name: 'Push A' },
      ),
      dayBody(2, ['chest'], [slotBody('d', 'chest', bench, 1, { target_sets: 3 })], { day_name: 'Push B' }),
    ],
    priorities: [{ muscle: 'chest', priority: 'focus' }],
  };
}

async function save(id: string, body: unknown): Promise<MesocycleDetail> {
  const response = await put(id, body);
  expect(response.status).toBe(200);
  return MesocycleDetailSchema.parse(await response.json());
}

describe('PUT /api/v1/mesocycles/{id}/schedule', () => {
  it('saves days, muscle groups, slots and priorities and returns the mesocycle', async () => {
    const id = await createDraft();
    const saved = await save(id, await pushSchedule());

    expect(saved.days.map((d) => d.day_name)).toEqual(['Push A', 'Push B']);
    expect(saved.days[0]?.muscle_groups.map((g) => g.muscle)).toEqual(['chest', 'triceps']);
    expect(saved.days[0]?.slots.map((s) => [s.muscle, s.exercise.name, s.sort_order])).toEqual([
      ['chest', 'Barbell Bench Press', 1],
      ['triceps', 'Cable Pushdown', 2],
      ['chest', 'Cable Fly', 3],
    ]);
    expect(saved.days[0]?.slots[0]).toMatchObject({
      target_sets: 4,
      rep_range_min: 6,
      rep_range_max: 10,
      target_rir: 2,
      starting_weight: 185.5,
    });
    expect(saved.days[0]?.slots[1]).toMatchObject({ target_sets: 3, rep_range_min: 8, rep_range_max: 12, target_rir: 3, starting_weight: null });
    expect(saved.priorities).toEqual([{ muscle: 'chest', priority: 'focus' }]);
  });

  it('persists what it returns (GET matches PUT)', async () => {
    const id = await createDraft();
    const saved = await save(id, await pushSchedule());
    const fetched = MesocycleDetailSchema.parse(await (await GET(request(`/api/v1/mesocycles/${id}`), ctx(id))).json());
    expect(withoutIds(fetched)).toEqual(withoutIds(saved));
  });

  it('computes volume with the shared engine, including frequency and priority bands', async () => {
    const id = await createDraft();
    const saved = await save(id, await pushSchedule());
    const { summary } = saved.volume_summary;
    // chest: 4 + 3 (day 1) + 3 (day 2) direct sets across two days
    expect(summary.chest).toMatchObject({
      total_sets: 10,
      weekly_frequency: 2,
      status: 'ABOVE_MEV',
      color: 'lightgreen',
      priority: 'focus',
      target_band: { low: 16, high: 20 },
    });
    // triceps: 3 direct + 0.5 × 4 (bench d1) + 0.5 × 3 (bench d2)
    expect(summary.triceps).toMatchObject({ total_sets: 6.5, weekly_frequency: 1 });
    expect(summary.front_delts?.total_sets).toBe(3.5);
  });

  it('shows assigned muscles with zero sets in the volume summary', async () => {
    const id = await createDraft();
    const saved = await save(id, { days: [dayBody(1, ['quads'], [])] });
    expect(saved.volume_summary.summary.quads).toMatchObject({ total_sets: 0, status: 'BELOW_MV', color: 'amber' });
  });

  it('is idempotent: the same body twice gives the same schedule', async () => {
    const id = await createDraft();
    const body = await pushSchedule();
    const first = await save(id, body);
    const second = await save(id, body);
    expect(withoutIds(second)).toEqual(withoutIds(first));
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: id } })).toBe(2);
    expect(await prisma.exerciseSlot.count({ where: { dayMuscleGroup: { day: { mesocycleId: id } } } })).toBe(4);
  });

  it('replaces everything, including days, groups, slots and priorities', async () => {
    const id = await createDraft();
    await save(id, await pushSchedule());
    const legs = await exerciseId('Leg Press');
    const saved = await save(id, { days: [dayBody(1, ['quads'], [slotBody('x', 'quads', legs, 1)])] });

    expect(saved.days).toHaveLength(1);
    expect(saved.priorities).toEqual([]);
    expect(Object.keys(saved.volume_summary.summary).sort()).toEqual(['glutes', 'quads']);
    expect(await prisma.dayMuscleGroup.count({ where: { day: { mesocycleId: id } } })).toBe(1);
    expect(await prisma.mesocycleMusclePriority.count({ where: { mesocycleId: id } })).toBe(0);
  });

  it('rejects a schedule with no days', async () => {
    const id = await createDraft();
    const response = await put(id, { days: [] });
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.details?.map((d) => d.path)).toContain('days');
  });

  it('keeps empty days as rest days and tracks the cycle length in days_per_week', async () => {
    const id = await createDraft();
    const bench = await exerciseId('Barbell Bench Press');
    const saved = await save(id, {
      days: [dayBody(1, ['chest'], [slotBody('a', 'chest', bench, 1)]), dayBody(2, [], []), dayBody(3, [], []), dayBody(4, [], []), dayBody(5, [], [])],
    });
    expect(saved.days).toHaveLength(5);
    expect(saved.days.filter((d) => d.slots.length === 0)).toHaveLength(4);
    expect(saved.days_per_week).toBe(5);
  });

  it('keeps cross-muscle slot order global per day and allows a mismatched primary muscle', async () => {
    const id = await createDraft();
    const squat = await exerciseId('Barbell Back Squat'); // primary quads, placed in a chest section
    const saved = await save(id, { days: [dayBody(1, ['chest'], [slotBody('a', 'chest', squat, 1)])] });
    expect(saved.days[0]?.slots[0]?.muscle).toBe('chest');
    expect(saved.volume_summary.summary.quads?.total_sets).toBe(3);
  });

  it('completes in under 500 ms for 6 days x 12 slots', async () => {
    const id = await createDraft({ days_per_week: 6 });
    const ids = await Promise.all(['Barbell Bench Press', 'Cable Fly', 'Leg Press', 'Lat Pulldown'].map(exerciseId));
    const days = Array.from({ length: 6 }, (_, d) =>
      dayBody(
        d + 1,
        ['chest', 'quads', 'lats'],
        Array.from({ length: 12 }, (_, s) =>
          slotBody(`s${s}`, (['chest', 'quads', 'lats'] as const)[s % 3] as string, ids[s % 4] as string, s + 1),
        ),
      ),
    );
    const started = performance.now();
    const response = await put(id, { days });
    const elapsed = performance.now() - started;
    expect(response.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });

  describe('validation', () => {
    async function expect400(id: string, body: unknown, path: string) {
      const response = await put(id, body);
      expect(response.status).toBe(400);
      const error = ApiErrorSchema.parse(await response.json()).error;
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details?.map((d) => d.path)).toContain(path);
    }

    it('rejects a slot whose muscle has no group on the same day', async () => {
      const id = await createDraft();
      const bench = await exerciseId('Barbell Bench Press');
      await expect400(id, { days: [dayBody(1, ['chest'], [slotBody('a', 'triceps', bench, 1)])] }, 'days[0].slots[0].muscle');
    });

    it('rejects an unknown exercise id', async () => {
      const id = await createDraft();
      const missing = '3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001';
      await expect400(id, { days: [dayBody(1, ['chest'], [slotBody('a', 'chest', missing, 1)])] }, 'days[0].slots[0].exercise_id');
    });

    it('rejects another user\'s custom exercise', async () => {
      const id = await createDraft();
      const theirs = await prisma.exercise.create({
        data: { name: 'Secret Move', primaryMuscle: 'chest', equipmentType: 'cable', movementType: 'isolation', isCustom: true, userId: await otherUserId() },
      });
      await expect400(id, { days: [dayBody(1, ['chest'], [slotBody('a', 'chest', theirs.id, 1)])] }, 'days[0].slots[0].exercise_id');
    });

    it('rejects out-of-range metrics with the exact field path', async () => {
      const id = await createDraft();
      const bench = await exerciseId('Barbell Bench Press');
      await expect400(
        id,
        { days: [dayBody(1, ['chest'], [slotBody('a', 'chest', bench, 1), slotBody('b', 'chest', bench, 2, { target_sets: 11 })])] },
        'days[0].slots[1].target_sets',
      );
    });

    it('rejects a weekday in relative mode', async () => {
      const id = await createDraft();
      await expect400(id, { days: [dayBody(1, ['chest'], [], { weekday: 2 })] }, 'days[0].weekday');
    });

    it('needs a full Mon-Sun week with unique weekdays in calendar mode', async () => {
      const id = await createDraft({ schedule_mode: 'calendar', days_per_week: 7 });
      const week = (weekdays: (number | null)[]) => ({
        days: weekdays.map((weekday, i) => dayBody(i + 1, [], [], { weekday, day_name: `D${i + 1}` })),
      });
      await expect400(id, week([0, 1, 2]), 'days');
      await expect400(id, week([0, 1, 2, 3, 4, 5, 5]), 'days[6].weekday');
      await expect400(id, week([0, 1, 2, 3, 4, 5, null]), 'days[6].weekday');
      const saved = await save(id, week([0, 1, 2, 3, 4, 5, 6]));
      expect(saved.days.map((d) => d.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    });

    it('switches between weekday names and numbered days through schedule_mode', async () => {
      const id = await createDraft({ schedule_mode: 'calendar', days_per_week: 7 });
      const numbered = { schedule_mode: 'relative', days: Array.from({ length: 8 }, (_, i) => dayBody(i + 1, [], [])) };
      const saved = await save(id, numbered);
      expect(saved).toMatchObject({ schedule_mode: 'relative', days_per_week: 8 });
      expect(saved.days.every((d) => d.weekday === null)).toBe(true);

      // Weekday names again: needs 7 days with weekdays, sent together with the mode.
      await expect400(id, { schedule_mode: 'calendar', days: numbered.days }, 'days');
      const week = { schedule_mode: 'calendar', days: Array.from({ length: 7 }, (_, i) => dayBody(i + 1, [], [], { weekday: i })) };
      expect(await save(id, week)).toMatchObject({ schedule_mode: 'calendar', days_per_week: 7 });
    });

    it('rejects a malformed body and keeps the existing schedule', async () => {
      const id = await createDraft();
      const before = await save(id, await pushSchedule());
      const response = await PUT(request(`/api/v1/mesocycles/${id}/schedule`, { method: 'PUT', body: '{nope' }), ctx(id));
      expect(response.status).toBe(400);
      const after = MesocycleDetailSchema.parse(await (await GET(request(`/api/v1/mesocycles/${id}`), ctx(id))).json());
      expect(withoutIds(after)).toEqual(withoutIds(before));
    });

    it('leaves the existing schedule untouched when validation fails', async () => {
      const id = await createDraft();
      const before = await save(id, await pushSchedule());
      const missing = '3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001';
      const response = await put(id, { days: [dayBody(1, ['chest'], [slotBody('a', 'chest', missing, 1)])] });
      expect(response.status).toBe(400);
      const after = MesocycleDetailSchema.parse(await (await GET(request(`/api/v1/mesocycles/${id}`), ctx(id))).json());
      expect(withoutIds(after)).toEqual(withoutIds(before));
    });
  });

  describe('access rules', () => {
    it.each(['active', 'completed'] as const)('returns 409 when the mesocycle is %s', async (status) => {
      const id = await createDraft();
      await prisma.mesocycle.update({ where: { id }, data: { status } });
      const response = await put(id, { days: [] });
      expect(response.status).toBe(409);
      expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('CONFLICT');
      expect(await prisma.mesocycleDay.count({ where: { mesocycleId: id } })).toBe(3);
    });

    it('returns 404 for another user\'s mesocycle and does not modify it', async () => {
      const theirs = await prisma.mesocycle.create({ data: { userId: await otherUserId(), name: 'Theirs', daysPerWeek: 3 } });
      const response = await put(theirs.id, { days: [dayBody(1, ['chest'], [])] });
      expect(response.status).toBe(404);
      expect(await prisma.mesocycleDay.count({ where: { mesocycleId: theirs.id } })).toBe(0);
    });

    it('returns 404 for an unknown or malformed id', async () => {
      for (const id of ['3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001', 'nope']) {
        expect((await put(id, { days: [] })).status).toBe(404);
      }
    });
  });
});
