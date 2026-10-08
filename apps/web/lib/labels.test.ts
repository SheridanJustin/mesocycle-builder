import { MUSCLE_GROUPS, MUSCLES, VOLUME_STATUSES } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { groupLabel, muscleLabel, STATUS_DESCRIPTION, STATUS_LABEL } from './labels';

describe('labels', () => {
  it('humanizes enum values', () => {
    expect(muscleLabel('upper_back')).toBe('Upper back');
    expect(muscleLabel('chest')).toBe('Chest');
    expect(new Set(MUSCLES.map(muscleLabel)).size).toBe(MUSCLES.length);
    expect(MUSCLE_GROUPS.map(groupLabel)).toEqual(['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Abs']);
  });

  it('has a text label and description for every status', () => {
    for (const status of VOLUME_STATUSES) {
      expect(STATUS_LABEL[status].length).toBeGreaterThan(0);
      expect(STATUS_DESCRIPTION[status].length).toBeGreaterThan(0);
    }
    expect(new Set(Object.values(STATUS_LABEL)).size).toBe(VOLUME_STATUSES.length);
  });
});
