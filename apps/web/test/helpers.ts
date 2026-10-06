import type { MesocycleDetail } from '@mesocycle/shared';
import { prisma } from '../lib/db';

export const DEV_EMAIL = 'integration-dev@example.com';

export function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

export function jsonRequest(method: string, path: string, body: unknown): Request {
  return request(path, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

export const postJson = (path: string, body: unknown) => jsonRequest('POST', path, body);
export const putJson = (path: string, body: unknown) => jsonRequest('PUT', path, body);
export const patchJson = (path: string, body: unknown) => jsonRequest('PATCH', path, body);

// Route context for dynamic [id] routes.
export function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

export async function devUserId(): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: DEV_EMAIL } });
  return user.id;
}

// Removes everything tests create; the seeded catalog and the dev user stay.
export async function cleanCustomData(): Promise<void> {
  await prisma.mesocycle.deleteMany({});
  await prisma.exercise.deleteMany({ where: { isCustom: true } });
  await prisma.user.deleteMany({ where: { email: { not: DEV_EMAIL } } });
}

export async function exerciseId(name: string): Promise<string> {
  const row = await prisma.exercise.findFirstOrThrow({ where: { userId: null, name }, select: { id: true } });
  return row.id;
}

export async function otherUserId(): Promise<string> {
  const user = await prisma.user.upsert({ where: { email: 'other@example.com' }, update: {}, create: { email: 'other@example.com' } });
  return user.id;
}

export async function readJson<T = unknown>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

type SlotOverrides = Record<string, unknown>;

export function slotBody(clientId: string, muscle: string, exercise_id: string, sort_order: number, overrides: SlotOverrides = {}) {
  return { client_id: clientId, muscle, exercise_id, sort_order, ...overrides };
}

export function dayBody(
  n: number,
  muscles: string[],
  slots: ReturnType<typeof slotBody>[],
  overrides: Record<string, unknown> = {},
) {
  return {
    day_number: n,
    weekday: null,
    day_name: `Day ${n}`,
    sort_order: n,
    muscle_groups: muscles.map((muscle, i) => ({ muscle, sort_order: i + 1 })),
    slots,
    ...overrides,
  };
}

// Strips server-generated ids so two saved schedules can be compared.
export function withoutIds(detail: MesocycleDetail) {
  return {
    ...detail,
    id: undefined,
    updated_at: undefined,
    days: detail.days.map((day) => ({
      ...day,
      id: undefined,
      muscle_groups: day.muscle_groups.map((g) => ({ ...g, id: undefined })),
      slots: day.slots.map((slot) => ({ ...slot, id: undefined })),
    })),
  };
}
