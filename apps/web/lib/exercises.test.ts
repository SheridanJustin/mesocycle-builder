import { describe, expect, it } from 'vitest';
import { ApiRouteError } from './api';
import { decodeCursor, encodeCursor } from './exercises';

describe('exercise cursor', () => {
  it('round-trips', () => {
    const cursor = { name: 'Cable Fly', id: 'e3b0c442-98fc-4c14-9afb-f4c8996fb924' };
    expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
  });

  it.each(['not-base64-json', Buffer.from('{"name":1}').toString('base64url'), Buffer.from('null').toString('base64url')])(
    'rejects %s',
    (value) => {
      expect(() => decodeCursor(value)).toThrow(ApiRouteError);
    },
  );
});
