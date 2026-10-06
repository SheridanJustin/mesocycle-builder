import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ApiErrorSchema, formatIssuePath, toApiError } from './errors';

describe('formatIssuePath', () => {
  it('joins keys with dots and indexes with brackets', () => {
    expect(formatIssuePath(['days', 0, 'slots', 1, 'target_sets'])).toBe('days[0].slots[1].target_sets');
  });

  it('handles an empty path and a leading index', () => {
    expect(formatIssuePath([])).toBe('');
    expect(formatIssuePath([2, 'name'])).toBe('[2].name');
  });
});

describe('toApiError', () => {
  it('builds a VALIDATION_ERROR body that satisfies ApiErrorSchema', () => {
    const result = z.object({ days: z.array(z.object({ n: z.number() })) }).safeParse({ days: [{ n: 'x' }] });
    if (result.success) throw new Error('expected failure');
    const body = toApiError(result.error);
    expect(ApiErrorSchema.parse(body)).toEqual(body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details?.[0]?.path).toBe('days[0].n');
  });
});
