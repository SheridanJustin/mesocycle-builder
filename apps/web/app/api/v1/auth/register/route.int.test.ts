import { AccountSchema, ApiErrorSchema } from '@mesocycle/shared';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { findOrCreateGoogleUser, verifyCredentials } from '../../../../../lib/accounts';
import { prisma } from '../../../../../lib/db';
import { cleanCustomData, postJson } from '../../../../../test/helpers';
import { signInAs } from '../../../../../test/session';
import { GET as listMesocycles, POST as createMesocycle } from '../../mesocycles/route';
import { POST } from './route';

beforeEach(cleanCustomData);
afterAll(async () => {
  await cleanCustomData();
  await prisma.$disconnect();
});

const register = (body: unknown) => POST(postJson('/api/v1/auth/register', body));

describe('POST /api/v1/auth/register', () => {
  it('creates an account with a hashed password and a normalized email', async () => {
    const response = await register({ email: ' New.User@Example.com ', password: 'a good password', name: 'New User' });
    expect(response.status).toBe(201);
    const text = await response.text();
    expect(text).not.toContain('password');
    const account = AccountSchema.parse(JSON.parse(text));
    expect(account).toMatchObject({ email: 'new.user@example.com', name: 'New User' });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: account.id } });
    expect(row.passwordHash).toMatch(/^scrypt\$/);
  });

  it('refuses an email that already has an account', async () => {
    await register({ email: 'taken@example.com', password: 'first password' });
    const response = await register({ email: 'TAKEN@example.com', password: 'second password' });
    expect(response.status).toBe(409);
    expect(ApiErrorSchema.parse(await response.json()).error.message).toContain('already exists');
  });

  it('lets the seeded dev user (no password yet) be claimed outside production', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { email: 'integration-dev@example.com' } });
    const response = await register({ email: 'integration-dev@example.com', password: 'claim my data' });
    expect(response.status).toBe(201);
    expect(AccountSchema.parse(await response.json()).id).toBe(before.id);
    // Restore the seeded state for the other tests.
    await prisma.user.update({ where: { id: before.id }, data: { passwordHash: null } });
  });

  it.each([{ email: 'bad', password: 'long enough' }, { email: 'a@b.co', password: 'short' }, {}])('returns 400 for %j', async (body) => {
    expect((await register(body)).status).toBe(400);
  });
});

describe('verifyCredentials', () => {
  it('accepts the right password only', async () => {
    await register({ email: 'login@example.com', password: 'secret password' });
    expect((await verifyCredentials('LOGIN@example.com', 'secret password'))?.email).toBe('login@example.com');
    expect(await verifyCredentials('login@example.com', 'wrong password')).toBeNull();
    expect(await verifyCredentials('nobody@example.com', 'secret password')).toBeNull();
  });
});

describe('findOrCreateGoogleUser', () => {
  const profile = { sub: 'google-123', email: 'g@example.com', emailVerified: true, name: 'G User' };

  it('creates an account, then finds it again by Google id', async () => {
    const created = await findOrCreateGoogleUser(profile);
    expect(created).toMatchObject({ email: 'g@example.com', googleId: 'google-123', name: 'G User', passwordHash: null });
    expect((await findOrCreateGoogleUser({ ...profile, email: 'changed@example.com' })).id).toBe(created.id);
  });

  it('links to an existing email/password account with the same verified email', async () => {
    const account = AccountSchema.parse(await (await register({ email: 'g@example.com', password: 'password one' })).json());
    const linked = await findOrCreateGoogleUser(profile);
    expect(linked.id).toBe(account.id);
    expect(linked.googleId).toBe('google-123');
    expect(await verifyCredentials('g@example.com', 'password one')).not.toBeNull();
  });

  it('refuses an unverified Google email', async () => {
    await expect(findOrCreateGoogleUser({ ...profile, emailVerified: false })).rejects.toThrow('not verified');
  });
});

describe('sessions scope the API', () => {
  it('returns 401 without a session', async () => {
    signInAs(null);
    const response = await listMesocycles();
    expect(response.status).toBe(401);
    expect(ApiErrorSchema.parse(await response.json()).error.code).toBe('UNAUTHORIZED');
  });

  it('shows each account only its own mesocycles', async () => {
    const other = AccountSchema.parse(await (await register({ email: 'other-user@example.com', password: 'password two' })).json());
    await createMesocycle(postJson('/api/v1/mesocycles', { name: 'Dev user plan' }));
    signInAs(other.id);
    await createMesocycle(postJson('/api/v1/mesocycles', { name: 'Other user plan' }));
    const theirs = (await (await listMesocycles()).json()) as { items: { name: string }[] };
    expect(theirs.items.map((i) => i.name)).toEqual(['Other user plan']);
  });
});
