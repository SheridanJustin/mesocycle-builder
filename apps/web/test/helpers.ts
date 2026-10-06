import { prisma } from '../lib/db';

export const DEV_EMAIL = 'integration-dev@example.com';

export function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init);
}

export function postJson(path: string, body: unknown): Request {
  return request(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

export async function devUserId(): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { email: DEV_EMAIL } });
  return user.id;
}

// Removes everything tests create (custom exercises and extra users); the seeded catalog stays.
export async function cleanCustomData(): Promise<void> {
  await prisma.exercise.deleteMany({ where: { isCustom: true } });
  await prisma.user.deleteMany({ where: { email: { not: DEV_EMAIL } } });
}
