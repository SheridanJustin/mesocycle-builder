import type { GroupVolume } from '@mesocycle/shared';
import { describe, expect, it } from 'vitest';
import { formatSets, rangeGeometry, rangeLabels } from './range-geometry';

const chest: Pick<GroupVolume, 'exact_total_sets' | 'landmarks'> = {
  exact_total_sets: 12,
  landmarks: { mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 },
};

describe('rangeGeometry', () => {
  it('scales slightly past MRV so the last mark is inside the bar', () => {
    const g = rangeGeometry(chest);
    expect(g.scaleMax).toBeCloseTo(22 * 1.08);
    const mrv = g.marks.find((m) => m.key === 'mrv');
    expect(mrv?.pct).toBeCloseTo(92.59, 1);
  });

  it('orders marks MV < MEV < MAV low < MAV high < MRV', () => {
    const pcts = rangeGeometry(chest).marks.map((m) => m.pct);
    expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
    expect(rangeGeometry(chest).marks.map((m) => m.label)).toEqual(['MV', 'MEV', 'MAV low', 'MAV high', 'MRV']);
  });

  it('positions the value on the same scale as the marks', () => {
    const g = rangeGeometry(chest);
    expect(g.valuePct).toBeCloseTo((12 / g.scaleMax) * 100);
    expect(g.valuePct).toBe(g.marks.find((m) => m.key === 'mav_low')?.pct);
  });

  it('extends the scale when the total exceeds MRV', () => {
    const g = rangeGeometry({ ...chest, exact_total_sets: 30 });
    expect(g.scaleMax).toBeCloseTo(30 * 1.08);
    expect(g.valuePct).toBeCloseTo(92.59, 1);
    expect(g.marks.find((m) => m.key === 'mrv')!.pct).toBeLessThan(g.valuePct);
  });

  it('handles a zero total and all-zero landmarks without NaN', () => {
    const zero = rangeGeometry({ exact_total_sets: 0, landmarks: { mv: 0, mev: 0, mav_low: 0, mav_high: 0, mrv: 0 } });
    expect(zero.valuePct).toBe(0);
    expect(Number.isNaN(zero.scaleMax)).toBe(false);
  });
});

describe('formatSets', () => {
  it('shows integers plainly and halves with one decimal', () => {
    expect(formatSets(14)).toBe('14');
    expect(formatSets(6.5)).toBe('6.5');
    expect(formatSets(0)).toBe('0');
  });
});

describe('rangeLabels', () => {
  it('labels MV, MEV, MAV (low end) and MRV when they are far apart', () => {
    const marks = rangeGeometry({ exact_total_sets: 0, landmarks: { mv: 0, mev: 8, mav_low: 16, mav_high: 22, mrv: 30 } }).marks;
    expect(rangeLabels(marks).map((l) => l.text)).toEqual(['MV', 'MEV', 'MAV', 'MRV']);
  });

  it('merges landmarks that coincide or crowd each other', () => {
    const glutes = rangeGeometry({ exact_total_sets: 0, landmarks: { mv: 0, mev: 0, mav_low: 4, mav_high: 12, mrv: 16 } }).marks;
    expect(rangeLabels(glutes).map((l) => l.text)).toEqual(['MV/MEV', 'MAV', 'MRV']);
    const chest = rangeGeometry({ exact_total_sets: 0, landmarks: { mv: 8, mev: 10, mav_low: 12, mav_high: 20, mrv: 22 } }).marks;
    expect(rangeLabels(chest).map((l) => l.text)).toEqual(['MV/MEV', 'MAV', 'MRV']);
  });
});
