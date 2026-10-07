import {
  ApiErrorSchema,
  ExerciseListSchema,
  ExerciseSchema,
  MAX_EXERCISE_PAGE_SIZE,
  MesocycleDetailSchema,
  MesocycleListSchema,
  MuscleLandmarkListSchema,
  type CreateExercise,
  type CreateMesocycle,
  type DuplicateDay,
  type LockMesocycle,
  type Exercise,
  type ListExercisesQuery,
  type PatchMesocycle,
  type UpdateSession,
} from '@mesocycle/shared';
import type { z, ZodTypeAny } from 'zod';
import type { ScheduleBody } from './builder/mappers';

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: { path: string; issue: string }[] = [],
  ) {
    super(message);
  }

  // Network failures and 5xx are worth retrying; 4xx will fail the same way again.
  get retryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

async function request<S extends ZodTypeAny>(path: string, init: RequestInit, schema: S): Promise<z.output<S>>;
async function request(path: string, init: RequestInit, schema?: undefined): Promise<void>;
async function request(path: string, init: RequestInit, schema?: ZodTypeAny): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...init,
      headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK', 'Could not reach the server');
  }

  if (!response.ok) {
    const parsed = ApiErrorSchema.safeParse(await response.json().catch(() => null));
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiClientError(response.status, code, message, details ?? []);
    }
    throw new ApiClientError(response.status, 'INTERNAL', `Request failed (${response.status})`);
  }
  if (!schema) return undefined;
  return schema.parse(await response.json());
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  listMesocycles: () => request('/mesocycles', { method: 'GET' }, MesocycleListSchema),
  createMesocycle: (body: CreateMesocycle | Record<string, unknown>) =>
    request('/mesocycles', json('POST', body), MesocycleDetailSchema),
  getMesocycle: (id: string) => request(`/mesocycles/${id}`, { method: 'GET' }, MesocycleDetailSchema),
  patchMesocycle: (id: string, body: PatchMesocycle) =>
    request(`/mesocycles/${id}`, json('PATCH', body), MesocycleDetailSchema),
  deleteMesocycle: (id: string) => request(`/mesocycles/${id}`, { method: 'DELETE' }),
  reorderMesocycles: (ids: string[]) => request('/mesocycles/order', json('PUT', { ids }), MesocycleListSchema),
  putSchedule: (id: string, body: ScheduleBody) =>
    request(`/mesocycles/${id}/schedule`, json('PUT', body), MesocycleDetailSchema),
  dropMesocycle: (id: string) => request(`/mesocycles/${id}/drop`, json('POST', {}), MesocycleDetailSchema),
  updateSession: (id: string, status: UpdateSession['status']) =>
    request(`/sessions/${id}`, json('PATCH', { status }), MesocycleDetailSchema),
  lockMesocycle: (id: string, body: Partial<LockMesocycle>) =>
    request(`/mesocycles/${id}/lock`, json('POST', body), MesocycleDetailSchema),
  duplicateDay: (id: string, body: DuplicateDay) =>
    request(`/mesocycles/${id}/duplicate-day`, json('POST', body), MesocycleDetailSchema),
  getLandmarks: () => request('/muscle-landmarks', { method: 'GET' }, MuscleLandmarkListSchema),
  listExercises: (query: Partial<Omit<ListExercisesQuery, 'limit'>> & { limit?: number }) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return request(`/exercises${qs ? `?${qs}` : ''}`, { method: 'GET' }, ExerciseListSchema);
  },
  createExercise: (body: CreateExercise | Record<string, unknown>) =>
    request('/exercises', json('POST', body), ExerciseSchema),
};

// Every exercise the user can pick (built-in and custom), following the pagination cursor.
export async function fetchExerciseCatalog(): Promise<Exercise[]> {
  const all: Exercise[] = [];
  let cursor: string | undefined;
  do {
    const page = await api.listExercises({ limit: MAX_EXERCISE_PAGE_SIZE, ...(cursor ? { cursor } : {}) });
    all.push(...page.items);
    cursor = page.next_cursor ?? undefined;
  } while (cursor);
  return all;
}
