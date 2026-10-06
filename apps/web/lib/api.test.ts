import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { ApiRouteError, handle, jsonResponse, parseJsonBody } from './api';

describe('handle', () => {
  it('passes a successful response through', async () => {
    const response = await handle(async () => jsonResponse(z.object({ ok: z.boolean() }), { ok: true }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it.each([
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['VALIDATION_ERROR', 400],
  ] as const)('maps ApiRouteError %s to %i in the spec format', async (code, status) => {
    const response = await handle(async () => {
      throw new ApiRouteError(code, 'nope');
    });
    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toEqual({ error: { code, message: 'nope' } });
  });

  it('maps ZodError to VALIDATION_ERROR with formatted paths', async () => {
    const response = await handle(async () => {
      z.object({ days: z.array(z.object({ n: z.number() })) }).parse({ days: [{ n: 'x' }] });
      return jsonResponse(z.unknown(), null);
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string; details: { path: string }[] } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details[0]?.path).toBe('days[0].n');
  });

  it('hides unexpected errors behind INTERNAL', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await handle(async () => {
      throw new Error('secret db detail');
    });
    spy.mockRestore();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
  });
});

describe('parseJsonBody', () => {
  const schema = z.object({ name: z.string() });

  it('parses valid JSON', async () => {
    const request = new Request('http://x', { method: 'POST', body: JSON.stringify({ name: 'a' }) });
    await expect(parseJsonBody(request, schema)).resolves.toEqual({ name: 'a' });
  });

  it('rejects malformed JSON as VALIDATION_ERROR', async () => {
    const request = new Request('http://x', { method: 'POST', body: '{nope' });
    await expect(parseJsonBody(request, schema)).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
