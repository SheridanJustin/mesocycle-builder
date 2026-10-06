import { ApiErrorSchema, VolumeSummarySchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../../lib/db';
import { cleanCustomData, exerciseId, otherUserId, postJson } from '../../../../../test/helpers';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const call = (body: unknown) => POST(postJson('/api/v1/mesocycles/validate-volume', body));

describe('POST /api/v1/mesocycles/validate-volume', () => {
  it('returns an empty summary for no slots', async () => {
    const response = await call({ slots: [] });
    expect(response.status).toBe(200);
    expect(VolumeSummarySchema.parse(await response.json())).toEqual({ summary: {} });
  });

  it('attributes primary and secondary sets and applies landmarks from the database', async () => {
    const bench = await exerciseId('Barbell Bench Press');
    const response = await call({
      slots: [
        { exercise_id: bench, target_sets: 6 },
        { exercise_id: bench, target_sets: 6 },
      ],
    });
    expect(response.status).toBe(200);
    const { summary } = VolumeSummarySchema.parse(await response.json());
    expect(summary.chest).toMatchObject({
      total_sets: 12,
      status: 'MAV',
      color: 'green',
      landmarks: { mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 },
    });
    expect(summary.triceps?.total_sets).toBe(6);
    expect(summary.front_delts?.total_sets).toBe(6);
  });

  it('uses day_id for frequency and priorities for the target band', async () => {
    const fly = await exerciseId('Cable Fly');
    const response = await call({
      slots: [
        { exercise_id: fly, target_sets: 6, day_id: 'mon' },
        { exercise_id: fly, target_sets: 6, day_id: 'thu' },
      ],
      priorities: [{ muscle: 'chest', priority: 'focus' }],
    });
    const { summary } = VolumeSummarySchema.parse(await response.json());
    expect(summary.chest).toMatchObject({ weekly_frequency: 2, priority: 'focus', target_band: { low: 16, high: 20 } });
  });

  it('includes assigned muscles with zero sets', async () => {
    const response = await call({ slots: [], assigned_muscles: ['chest'] });
    const { summary } = VolumeSummarySchema.parse(await response.json());
    expect(summary.chest).toMatchObject({ total_sets: 0, status: 'BELOW_MV' });
  });

  it('flags EXCEEDS_MRV in red', async () => {
    const fly = await exerciseId('Cable Fly');
    const response = await call({
      slots: [
        { exercise_id: fly, target_sets: 10 },
        { exercise_id: fly, target_sets: 10 },
        { exercise_id: fly, target_sets: 3 },
      ],
    });
    const { summary } = VolumeSummarySchema.parse(await response.json());
    expect(summary.chest).toMatchObject({ total_sets: 23, status: 'EXCEEDS_MRV', color: 'red' });
  });

  it('does not write anything', async () => {
    const before = await prisma.mesocycle.count();
    await call({ slots: [{ exercise_id: await exerciseId('Cable Fly'), target_sets: 3 }] });
    expect(await prisma.mesocycle.count()).toBe(before);
  });

  it('returns 400 for an unknown exercise, naming the slot', async () => {
    const response = await call({ slots: [{ exercise_id: '3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001', target_sets: 3 }] });
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.details?.[0]?.path).toBe('slots[0].exercise_id');
  });

  it('returns 400 for another user\'s custom exercise', async () => {
    const theirs = await prisma.exercise.create({
      data: { name: 'Secret', primaryMuscle: 'abs', equipmentType: 'cable', movementType: 'isolation', isCustom: true, userId: await otherUserId() },
    });
    expect((await call({ slots: [{ exercise_id: theirs.id, target_sets: 3 }] })).status).toBe(400);
  });

  it.each([
    ['sets above 10', { slots: [{ exercise_id: '3f2b0a54-5d0c-4c5b-9d77-0d5a2f1d0001', target_sets: 11 }] }],
    ['non-uuid exercise id', { slots: [{ exercise_id: 'x', target_sets: 3 }] }],
    ['missing slots', {}],
  ])('returns 400 for %s', async (_label, body) => {
    const response = await call(body);
    expect(response.status).toBe(400);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('VALIDATION_ERROR');
  });
});
