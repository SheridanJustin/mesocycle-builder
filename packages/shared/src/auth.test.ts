import { describe, expect, it } from 'vitest';
import { RegisterSchema, SignInSchema } from './auth';

describe('RegisterSchema', () => {
  it('normalizes the email and accepts an optional name', () => {
    expect(RegisterSchema.parse({ email: '  Ana@Example.COM ', password: 'longenough' })).toEqual({ email: 'ana@example.com', password: 'longenough' });
    expect(RegisterSchema.parse({ email: 'a@b.co', password: '12345678', name: ' Ana ' }).name).toBe('Ana');
  });

  it.each([
    [{ email: 'nope', password: 'longenough' }],
    [{ email: 'a@b.co', password: 'short' }],
    [{ email: 'a@b.co', password: 'x'.repeat(201) }],
    [{ email: 'a@b.co', password: 'longenough', name: '' }],
  ])('rejects %j', (body) => {
    expect(RegisterSchema.safeParse(body).success).toBe(false);
  });
});

describe('SignInSchema', () => {
  it('needs an email and a password', () => {
    expect(SignInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(SignInSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});
