import type { Exercise } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { mergeByName } from './use-exercise-search';

const ex = (id: string, name: string): Exercise => ({
  id,
  name,
  primary_muscle: 'chest',
  secondary_muscles: [],
  equipment_type: 'cable',
  movement_type: 'isolation',
  is_custom: false,
});

describe('mergeByName', () => {
  it('merges pages from several muscles, drops duplicates and sorts by name', () => {
    const merged = mergeByName([[ex('2', 'Cable Fly'), ex('1', 'Bench')], [ex('3', 'Arnold Press'), ex('2', 'Cable Fly')]]);
    expect(merged.map((e) => e.name)).toEqual(['Arnold Press', 'Bench', 'Cable Fly']);
  });

  it('handles no pages', () => {
    expect(mergeByName([])).toEqual([]);
  });
});
