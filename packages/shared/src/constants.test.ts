import { describe, expect, it } from 'vitest';
import { MUSCLE_GROUP_OF, MUSCLE_GROUPS, MUSCLES, SECONDARY_MUSCLE_WEIGHT, VOLUME_COLORS, VOLUME_STATUS_COLOR, VOLUME_STATUSES } from './constants';

describe('constants', () => {
  it('lists the 15 muscles from the spec without duplicates', () => {
    expect(MUSCLES).toHaveLength(15);
    expect(new Set(MUSCLES).size).toBe(15);
  });

  it('maps every status to one of the fixed colors (SPEC 7.4)', () => {
    expect(Object.keys(VOLUME_STATUS_COLOR).sort()).toEqual([...VOLUME_STATUSES].sort());
    expect(VOLUME_STATUS_COLOR).toEqual({
      BELOW_MV: 'amber',
      MAINTENANCE: 'amber',
      ABOVE_MEV: 'lightgreen',
      MAV: 'green',
      HIGH: 'orange',
      EXCEEDS_MRV: 'red',
    });
    for (const color of Object.values(VOLUME_STATUS_COLOR)) expect(VOLUME_COLORS).toContain(color);
  });

  it('weights secondary muscles at 0.5', () => {
    expect(SECONDARY_MUSCLE_WEIGHT).toBe(0.5);
  });

  it('maps every muscle to one of the 10 major groups, and every group has a muscle', () => {
    expect(MUSCLE_GROUPS).toHaveLength(10);
    expect(Object.keys(MUSCLE_GROUP_OF).sort()).toEqual([...MUSCLES].sort());
    expect(new Set(Object.values(MUSCLE_GROUP_OF))).toEqual(new Set(MUSCLE_GROUPS));
    expect([MUSCLE_GROUP_OF.lats, MUSCLE_GROUP_OF.upper_back, MUSCLE_GROUP_OF.traps]).toEqual(['back', 'back', 'back']);
    expect([MUSCLE_GROUP_OF.front_delts, MUSCLE_GROUP_OF.side_delts, MUSCLE_GROUP_OF.rear_delts]).toEqual(['shoulders', 'shoulders', 'shoulders']);
    expect(MUSCLE_GROUP_OF.forearms).toBe('biceps');
  });
});
