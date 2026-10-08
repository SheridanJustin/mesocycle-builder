import { ApiErrorSchema, MesocycleDetailSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../../lib/db';
import { lockMesocycle } from '../../../../../../lib/lock-in';
import {
  cleanCustomData,
  ctx,
  dayBody,
  devUserId,
  exerciseId,
  otherUserId,
  patchJson,
  postJson,
  putJson,
  request,
  slotBody,
} from '../../../../../../test/helpers';
import { POST as createMesocycle } from '../../route';
import { DELETE, PATCH } from '../route';
import { PUT as putSchedule } from '../schedule/route';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const lock = (id: string, body: unknown) => POST(postJson(`/api/v1/mesocycles/${id}/lock`, body), ctx(id));

async function createDraft(body: Record<string, unknown>): Promise<string> {
  return MesocycleDetailSchema.parse(await (await createMesocycle(postJson('/api/v1/mesocycles', body))).json()).id;
}

// Mon and Thu: bench press (10 chest sets a week, no warnings); every other day rests.
async function weekWithBench(benchSets = 5): Promise<string> {
  const id = await createDraft({ name: 'Lock me' });
  await PATCH(patchJson(`/api/v1/mesocycles/${id}`, { deload_final_week: true }), ctx(id));
  const bench = await exerciseId('Barbell Bench Press');
  const fly = await exerciseId('Cable Fly');
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = names.map((name, i) => {
    const base = { day_name: name, weekday: i };
    if (i === 0) {
      return dayBody(1, ['chest'], [
        slotBody('a', 'chest', bench, 1, { target_sets: benchSets, rep_range_min: 5, rep_range_max: 10, target_rir: 3, starting_weight: 100 }),
        slotBody('b', 'chest', fly, 2, { target_sets: 2, target_rir: 1 }),
      ], base);
    }
    if (i === 3) return dayBody(4, ['chest'], [slotBody('c', 'chest', bench, 1, { target_sets: benchSets, target_rir: 2 })], base);
    return dayBody(i + 1, [], [], base);
  });
  const saved = await putSchedule(putJson(`/api/v1/mesocycles/${id}/schedule`, { schedule_mode: 'calendar', days, priorities: [] }), ctx(id));
  expect(saved.status).toBe(200);
  return id;
}

describe('POST /api/v1/mesocycles/{id}/lock', () => {
  it('activates the mesocycle and generates weeks, dated workouts and the RIR ramp', async () => {
    const id = await weekWithBench();
    const response = await lock(id, { start_date: '2026-10-05' });
    expect(response.status).toBe(200);
    const body = MesocycleDetailSchema.parse(await response.json());

    expect(body.status).toBe('active');
    expect(body.locked_at).not.toBeNull();
    expect(body.start_date).toBe('2026-10-05');
    expect(body.weeks.map((w) => [w.week_number, w.is_deload])).toEqual([
      [1, false],
      [2, false],
      [3, false],
      [4, true],
    ]);
    // Rest days create no workouts: two per week, Monday and Thursday.
    expect(body.weeks.map((w) => w.sessions.map((s) => [s.day_name, s.scheduled_date]))).toEqual([
      [['Mon', '2026-10-05'], ['Thu', '2026-10-08']],
      [['Mon', '2026-10-12'], ['Thu', '2026-10-15']],
      [['Mon', '2026-10-19'], ['Thu', '2026-10-22']],
      [['Mon', '2026-10-26'], ['Thu', '2026-10-29']],
    ]);
    expect(body.weeks.flatMap((w) => w.sessions).every((s) => s.status === 'planned')).toBe(true);

    const mondayBench = body.weeks.map((w) => w.sessions[0]!.exercises[0]!);
    expect(mondayBench.map((e) => e.exercise.name)).toEqual(Array(4).fill('Barbell Bench Press'));
    expect(mondayBench.map((e) => e.target_rir)).toEqual([3, 2, 1, 3]);
    expect(mondayBench.map((e) => e.target_sets)).toEqual([5, 5, 5, 3]);
    expect(mondayBench.map((e) => e.target_weight)).toEqual([100, 100, 100, 90]);
    expect(mondayBench.map((e) => [e.rep_range_min, e.rep_range_max])).toEqual(Array(4).fill([5, 10]));
    // The fly starts at RIR 1 and bottoms out at 0.
    expect(body.weeks.map((w) => w.sessions[0]!.exercises[1]!.target_rir)).toEqual([1, 0, 0, 1]);
    expect(body.weeks[0]!.sessions[0]!.exercises.map((e) => e.sort_order)).toEqual([1, 2]);
    expect(await prisma.loggedSet.count()).toBe(0);
  });

  it('freezes the plan: schedule, settings, delete and a second lock all return 409', async () => {
    const id = await weekWithBench();
    expect((await lock(id, { start_date: '2026-10-05' })).status).toBe(200);
    const responses = [
      await putSchedule(putJson(`/api/v1/mesocycles/${id}/schedule`, { days: [dayBody(1, [], [])], priorities: [] }), ctx(id)),
      await PATCH(patchJson(`/api/v1/mesocycles/${id}`, { name: 'Changed' }), ctx(id)),
      await DELETE(request(`/api/v1/mesocycles/${id}`, { method: 'DELETE' }), ctx(id)),
      await lock(id, { start_date: '2026-10-05' }),
    ];
    for (const response of responses) {
      expect(response.status).toBe(409);
      expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('CONFLICT');
    }
    expect(await prisma.mesocycleWeek.count({ where: { mesocycleId: id } })).toBe(4);
  });

  it('needs a Monday start date for a Mon-Sun mesocycle', async () => {
    const id = await weekWithBench();
    for (const body of [{}, { start_date: '2026-10-07' }, { start_date: '2026-02-30' }, { start_date: '10/05/2026' }]) {
      const response = await lock(id, body);
      expect(response.status).toBe(400);
      expect(ApiErrorSchema.parse(await response.json()).error.details?.[0]?.path).toBe('start_date');
    }
    expect((await prisma.mesocycle.findUniqueOrThrow({ where: { id } })).status).toBe('draft');
  });

  it('numbered cycles lock without dates', async () => {
    const id = await createDraft({ name: 'Numbered', days_per_week: 2, schedule_mode: 'relative', duration_weeks: 3 });
    const bench = await exerciseId('Barbell Bench Press');
    await putSchedule(
      putJson(`/api/v1/mesocycles/${id}/schedule`, {
        days: [dayBody(1, ['chest'], [slotBody('a', 'chest', bench, 1, { target_sets: 10 })]), dayBody(2, [], [])],
        priorities: [],
      }),
      ctx(id),
    );
    const body = MesocycleDetailSchema.parse(await (await lock(id, {})).json());
    expect(body.start_date).toBeNull();
    expect(body.weeks).toHaveLength(3);
    expect(body.weeks.every((w) => w.sessions.length === 1 && w.sessions[0]!.scheduled_date === null)).toBe(true);
  });

  it('refuses a mesocycle without exercises', async () => {
    const id = await createDraft({});
    const response = await lock(id, { start_date: '2026-10-05' });
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.details?.[0]?.path).toBe('days');
  });

  it('asks to acknowledge groups below MV or above MRV', async () => {
    const id = await weekWithBench(1);
    const refused = await lock(id, { start_date: '2026-10-05' });
    expect(refused.status).toBe(400);
    const error = ApiErrorSchema.parse(await refused.json()).error;
    // Chest: 1 + 1 bench + 2 fly = 4 sets; triceps: 0.5 x 2 bench sets = 1 set (both below MV).
    expect(error.details).toEqual([
      { path: 'acknowledge_warnings', issue: 'Chest: Below MV (4 sets)' },
      { path: 'acknowledge_warnings', issue: 'Triceps: Below MV (1 set)' },
    ]);
    expect((await lock(id, { start_date: '2026-10-05', acknowledge_warnings: true })).status).toBe(200);
  });

  it('is atomic: a failure halfway leaves the draft untouched', async () => {
    const id = await weekWithBench();
    await expect(
      lockMesocycle(id, await devUserId(), { start_date: '2026-10-05', acknowledge_warnings: false }, {
        hooks: {
          afterWeeksCreated: () => {
            throw new Error('boom');
          },
        },
      }),
    ).rejects.toThrow('boom');
    const row = await prisma.mesocycle.findUniqueOrThrow({ where: { id } });
    expect([row.status, row.lockedAt, row.startDate]).toEqual(['draft', null, null]);
    expect(await prisma.mesocycleWeek.count({ where: { mesocycleId: id } })).toBe(0);
    expect(await prisma.workoutSession.count()).toBe(0);
    expect((await lock(id, { start_date: '2026-10-05' })).status).toBe(200);
  });

  it("returns 404 for another user's mesocycle or a malformed id", async () => {
    const theirs = await prisma.mesocycle.create({ data: { userId: await otherUserId(), name: 'Theirs', daysPerWeek: 7 } });
    expect((await lock(theirs.id, { start_date: '2026-10-05' })).status).toBe(404);
    expect((await lock('not-a-uuid', {})).status).toBe(404);
  });
});
