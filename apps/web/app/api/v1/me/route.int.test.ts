import { ApiErrorSchema, MeSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../../lib/db';
import { cleanCustomData, patchJson, request } from '../../../../test/helpers';
import { createLockedMesocycle } from '../../../../test/locked';
import { signInAs } from '../../../../test/session';
import { PATCH as patchSession } from '../sessions/[id]/route';
import { GET, PATCH } from './route';

beforeEach(async () => {
  await cleanCustomData();
  await prisma.user.update({ where: { email: 'integration-dev@example.com' }, data: { showRir: true, name: null, palette: 'graphite', colorMode: 'dark', weightUnit: 'lb' } });
});
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const me = async () => MeSchema.parse(await (await GET()).json());
const patch = (body: unknown) => PATCH(patchJson('/api/v1/me', body));
const setStatus = (id: string, status: string) => patchSession(patchJson(`/api/v1/sessions/${id}`, { status }), { params: Promise.resolve({ id }) });

describe('GET /api/v1/me', () => {
  it('returns the profile with zero stats for a new user', async () => {
    const body = await me();
    expect(body).toMatchObject({
      email: 'integration-dev@example.com',
      name: null,
      sign_in: { password: false, google: false },
      preferences: { show_rir: true, palette: 'graphite', color_mode: 'dark', weight_unit: 'lb' },
      stats: { workouts_completed: 0, workouts_skipped: 0, sets_completed: 0, mesocycles_completed: 0, mesocycles_total: 0, active: null },
    });
  });

  it('counts completed and skipped workouts, completed sets and the active mesocycle', async () => {
    // 3 weeks x 1 workout of 10 bench sets.
    const locked = await createLockedMesocycle(3);
    const [w1, w2] = locked.weeks.map((w) => w.sessions[0]!.id) as [string, string];
    await setStatus(w1, 'completed');
    await setStatus(w2, 'skipped');
    const body = await me();
    expect(body.stats).toEqual({
      workouts_completed: 1,
      workouts_skipped: 1,
      sets_completed: 10,
      mesocycles_completed: 0,
      mesocycles_total: 1,
      active: { id: locked.id, name: 'Tracked', done: 2, total: 3 },
    });

    // A completed workout with logged sets counts what was logged, not its target.
    const w3 = locked.weeks[2]!.sessions[0]!;
    for (const setNumber of [1, 2, 3]) {
      await prisma.loggedSet.create({ data: { sessionExerciseId: w3.exercises[0]!.id, setNumber, reps: 8, weight: 100 } });
    }
    await setStatus(w3.id, 'completed');
    expect((await me()).stats.sets_completed).toBe(13);
  });

  it('returns 401 without a session', async () => {
    signInAs(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('UNAUTHORIZED');
  });
});

describe('PATCH /api/v1/me', () => {
  it('turns RIR off and on and renames', async () => {
    expect(MeSchema.parse(await (await patch({ show_rir: false })).json()).preferences.show_rir).toBe(false);
    expect((await me()).preferences.show_rir).toBe(false);
    const renamed = MeSchema.parse(await (await patch({ show_rir: true, name: '  Sam  ' })).json());
    expect([renamed.preferences.show_rir, renamed.name]).toEqual([true, 'Sam']);
  });

  it('saves the palette and the light or dark mode', async () => {
    const body = MeSchema.parse(await (await patch({ palette: 'frost', color_mode: 'light' })).json());
    expect(body.preferences).toEqual({ show_rir: true, palette: 'frost', color_mode: 'light', weight_unit: 'lb' });
    expect((await me()).preferences.palette).toBe('frost');
  });

  it('saves the weight unit', async () => {
    expect(MeSchema.parse(await (await patch({ weight_unit: 'kg' })).json()).preferences.weight_unit).toBe('kg');
    expect((await me()).preferences.weight_unit).toBe('kg');
  });

  it.each([{}, { show_rir: 'no' }, { weight_unit: 'stone' }, { name: '' }, { palette: 'neon' }, { color_mode: 'sepia' }])('returns 400 for %j', async (body) => {
    expect((await patch(body)).status).toBe(400);
  });

  it('cannot reach another user', async () => {
    signInAs(null);
    expect((await PATCH(request('/api/v1/me', { method: 'PATCH', body: JSON.stringify({ show_rir: false }) }))).status).toBe(401);
  });
});
