import type { MuscleVolume } from '@mesocycle/shared';

export type RangeMark = { key: 'mv' | 'mev' | 'mav_low' | 'mav_high' | 'mrv'; label: string; value: number; pct: number };

export type RangeGeometry = {
  scaleMax: number;
  valuePct: number;
  marks: RangeMark[];
};

const MARK_LABELS: Record<RangeMark['key'], string> = {
  mv: 'MV',
  mev: 'MEV',
  mav_low: 'MAV low',
  mav_high: 'MAV high',
  mrv: 'MRV',
};

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

// Positions for the mini range-bar. The scale always reaches past MRV (or the current total, if
// higher) so an over-MRV muscle visibly overshoots the last mark.
export function rangeGeometry(entry: Pick<MuscleVolume, 'exact_total_sets' | 'landmarks'>): RangeGeometry {
  const { landmarks, exact_total_sets: total } = entry;
  const scaleMax = Math.max(landmarks.mrv, total, 1) * 1.08;
  const pct = (value: number) => clampPct((value / scaleMax) * 100);

  const marks = (Object.keys(MARK_LABELS) as RangeMark['key'][]).map((key) => ({
    key,
    label: MARK_LABELS[key],
    value: landmarks[key],
    pct: pct(landmarks[key]),
  }));

  return { scaleMax, valuePct: pct(total), marks };
}

export function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
