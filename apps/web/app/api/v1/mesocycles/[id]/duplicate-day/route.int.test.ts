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
  slotBody,
} from '../../../../../../test/helpers';
import { POST as createMesocycle } from '../../route';
import { PUT } from '../schedule/route';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

async function setup(daysPerWeek = 3, extra: Record<string, unknown> = {}): Promise<MesocycleDetail> {
  const created = MesocycleDetailSchema.parse(
    await (await createMesocycle(postJson('/api/v1/mesocycles', { name: 'Block', days_per_week: daysPerWeek, ...extra }))).json(),
  );
  const bench = await exerciseId('Barbell Bench Press');
  const pushdown = await exerciseId('Cable Pushdown');
  const response = await PUT(
    putJson(`/api/v1/mesocycles/${created.id}/schedule`, {
      days: Array.from({ length: daysPerWeek }, (_, i) =>
        i === 0
          ? dayBody(
              1,
              ['chest', 'triceps'],
              [
                slotBody('a', 'chest', bench, 1, { target_sets: 4, rep_range_min: 5, rep_range_max: 8, target_rir: 1, starting_weight: 102.5 }),
                slotBody('b', 'triceps', pushdown, 2, { target_sets: 2 }),
              ],
              { day_name: 'Push A', ...(extra.schedule_mode === 'calendar' ? { weekday: 0 } : {}) },
            )
          : dayBody(i + 1, ['quads'], [], { day_name: `Other ${i + 1}` }),
      ),
      priorities: [{ muscle: 'chest', priority: 'focus' }],
    }),
    ctx(created.id),
  );
  return MesocycleDetailSchema.parse(await response.json());
}

const duplicate = (id: string, body: unknown) => POST(postJson(`/api/v1/mesocycles/${id}/duplicate-day`, body), ctx(id));

describe('POST /api/v1/mesocycles/{id}/duplicate-day', () => {
  it('deep-copies the day with all slot metrics and renames it', async () => {
    const meso = await setup();
    const source = meso.days[0];
    const response = await duplicate(meso.id, { source_day_id: source?.id, target_position: 2, new_name: 'Push B' });
    expect(response.status).toBe(200);
    const updated = MesocycleDetailSchema.parse(await response.json());

    expect(updated.days.map((d) => d.day_name)).toEqual(['Push A', 'Push B', 'Other 2', 'Other 3']);
    const copy = updated.days[1];
    expect(copy?.muscle_groups.map((g) => g.muscle)).toEqual(['chest', 'triceps']);
    expect(copy?.slots.map((s) => ({ ...s, id: undefined }))).toEqual(source?.slots.map((s) => ({ ...s, id: undefined })));
    expect(copy?.slots[0]).toMatchObject({ target_sets: 4, rep_range_min: 5, rep_range_max: 8, target_rir: 1, starting_weight: 102.5 });
    // New rows, not shared references.
    expect(copy?.id).not.toBe(source?.id);
    expect(copy?.slots[0]?.id).not.toBe(source?.slots[0]?.id);
    expect(copy?.muscle_groups[0]?.id).not.toBe(source?.muscle_groups[0]?.id);
  });

  it('defaults the name to "<source> (copy)" and keeps the source unchanged', async () => {
    const meso = await setup();
    const updated = MesocycleDetailSchema.parse(
      await (await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 2 })).json(),
    );
    expect(updated.days[1]?.day_name).toBe('Push A (copy)');
    expect(updated.days[0]).toEqual(expect.objectContaining({ day_name: 'Push A', id: meso.days[0]?.id }));
    expect(updated.days[0]?.slots).toHaveLength(2);
  });

  it('shifts later days and renumbers sort_order and day_number to 1..n', async () => {
    const meso = await setup();
    const updated = MesocycleDetailSchema.parse(
      await (await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 2 })).json(),
    );
    expect(updated.days.map((d) => d.sort_order)).toEqual([1, 2, 3, 4]);
    expect(updated.days.map((d) => d.day_number)).toEqual([1, 2, 3, 4]);
    expect(updated.days[2]?.id).toBe(meso.days[1]?.id);
    expect(updated.days[3]?.id).toBe(meso.days[2]?.id);
  });

  it.each([
    [1, ['Push A (copy)', 'Push A', 'Other 2', 'Other 3']],
    [4, ['Push A', 'Other 2', 'Other 3', 'Push A (copy)']],
  ])('inserts at position %i', async (position, names) => {
    const meso = await setup();
    const updated = MesocycleDetailSchema.parse(
      await (await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: position })).json(),
    );
    expect(updated.days.map((d) => d.day_name)).toEqual(names);
  });

  it('counts the copy toward volume', async () => {
    const meso = await setup();
    const before = meso.volume_summary.summary.chest;
    const updated = MesocycleDetailSchema.parse(
      await (await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 2 })).json(),
    );
    expect(before).toMatchObject({ total_sets: 4, weekly_frequency: 1 });
    expect(updated.volume_summary.summary.chest).toMatchObject({ total_sets: 8, weekly_frequency: 2 });
  });

  it('gives the copy no weekday in calendar mode so weekdays stay unique', async () => {
    const meso = await setup(2, { schedule_mode: 'calendar' });
    const updated = MesocycleDetailSchema.parse(
      await (await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 2 })).json(),
    );
    expect(updated.days[0]?.weekday).toBe(0);
    expect(updated.days[1]?.weekday).toBeNull();
  });

  it('allows a 7th day via duplicate but returns 409 for an 8th', async () => {
    const meso = await setup(6);
    const seventh = MesocycleDetailSchema.parse(
      await (await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 7 })).json(),
    );
    expect(seventh.days).toHaveLength(7);
    expect(seventh.days[6]?.day_number).toBe(7);

    const response = await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 7 });
    expect(response.status).toBe(409);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('CONFLICT');
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: meso.id } })).toBe(7);
  });

  it('returns 400 when target_position skips past the end', async () => {
    const meso = await setup();
    for (const target_position of [5, 0, 8]) {
      const response = await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position });
      expect(response.status).toBe(400);
    }
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: meso.id } })).toBe(3);
  });

  it('returns 404 for a source day from another mesocycle or a missing one', async () => {
    const meso = await setup();
    const elsewhere = await setup();
    for (const source_day_id of [elsewhere.days[0]?.id, '3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001', 'not-a-uuid']) {
      const response = await duplicate(meso.id, { source_day_id, target_position: 2 });
      // 'not-a-uuid' fails body validation (400); the others are 404.
      expect(response.status).toBe(source_day_id === 'not-a-uuid' ? 400 : 404);
    }
  });

  it.each(['active', 'completed'] as const)('returns 409 when the mesocycle is %s', async (status) => {
    const meso = await setup();
    await prisma.mesocycle.update({ where: { id: meso.id }, data: { status } });
    const response = await duplicate(meso.id, { source_day_id: meso.days[0]?.id, target_position: 2 });
    expect(response.status).toBe(409);
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: meso.id } })).toBe(3);
  });

  it('returns 404 for another user\'s mesocycle', async () => {
    const theirs = await prisma.mesocycle.create({ data: { userId: await otherUserId(), name: 'Theirs', daysPerWeek: 3 } });
    const day = await prisma.mesocycleDay.create({ data: { mesocycleId: theirs.id, dayNumber: 1, dayName: 'X', sortOrder: 1 } });
    const response = await duplicate(theirs.id, { source_day_id: day.id, target_position: 2 });
    expect(response.status).toBe(404);
    expect(await prisma.mesocycleDay.count({ where: { mesocycleId: theirs.id } })).toBe(1);
  });
});
