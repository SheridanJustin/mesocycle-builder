import { describe, expect, it } from 'vitest';
import { startsOnControl } from './sensors';

// A minimal stand-in for a DOM element: `closest` answers whether a control encloses it.
const element = (insideControl: boolean) => ({ closest: () => (insideControl ? {} : null) });

describe('startsOnControl', () => {
  it('is true for presses on inputs, selects, buttons and labels', () => {
    expect(startsOnControl(element(true) as unknown as EventTarget)).toBe(true);
  });

  it('is false for presses on the card body', () => {
    expect(startsOnControl(element(false) as unknown as EventTarget)).toBe(false);
  });

  it('is false for targets that are not elements', () => {
    expect(startsOnControl(null)).toBe(false);
    expect(startsOnControl({} as EventTarget)).toBe(false);
  });
});
