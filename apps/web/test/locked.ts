import { MesocycleDetailSchema, type MesocycleDetail } from '@mesocycle/shared';
import { POST as lock } from '../app/api/v1/mesocycles/[id]/lock/route';
import { PATCH as patchMesocycle } from '../app/api/v1/mesocycles/[id]/route';
import { PUT as putSchedule } from '../app/api/v1/mesocycles/[id]/schedule/route';
import { POST as createMesocycle } from '../app/api/v1/mesocycles/route';
import { ctx, dayBody, exerciseId, patchJson, postJson, putJson, slotBody } from './helpers';

// A locked numbered cycle: Day 1 trains chest (10 sets), Day 2 rests; `weeks` weeks long.
export async function createLockedMesocycle(weeks = 3, opts: { deload?: boolean } = {}): Promise<MesocycleDetail> {
  const created = MesocycleDetailSchema.parse(
    await (await createMesocycle(postJson('/api/v1/mesocycles', { name: 'Tracked', days_per_week: 2, schedule_mode: 'relative', duration_weeks: weeks }))).json(),
  );
  const bench = await exerciseId('Barbell Bench Press');
  await putSchedule(
    putJson(`/api/v1/mesocycles/${created.id}/schedule`, {
      days: [dayBody(1, ['chest'], [slotBody('a', 'chest', bench, 1, { target_sets: 10 })]), dayBody(2, [], [])],
      priorities: [],
    }),
    ctx(created.id),
  );
  if (opts.deload) await patchMesocycle(patchJson(`/api/v1/mesocycles/${created.id}`, { deload_final_week: true }), ctx(created.id));
  const response = await lock(postJson(`/api/v1/mesocycles/${created.id}/lock`, {}), ctx(created.id));
  if (response.status !== 200) throw new Error(`lock failed: ${response.status}`);
  return MesocycleDetailSchema.parse(await response.json());
}
