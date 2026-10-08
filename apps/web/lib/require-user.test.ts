import { describe, expect, it, vi } from 'vitest';

vi.mock('./auth', () => ({ auth: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

const { safeCallbackPath } = await import('./require-user');

describe('safeCallbackPath', () => {
  it('keeps same-site paths and falls back otherwise', () => {
    expect(safeCallbackPath('/mesocycles/abc/build')).toBe('/mesocycles/abc/build');
    expect(safeCallbackPath(['/mesocycles/x', '/other'])).toBe('/mesocycles/x');
    for (const bad of [undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'mesocycles']) {
      expect(safeCallbackPath(bad)).toBe('/mesocycles');
    }
  });
});
