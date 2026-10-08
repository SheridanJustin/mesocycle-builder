import type { GroupVolume } from '@mesocycle/shared';

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
export function rangeGeometry(entry: Pick<GroupVolume, 'exact_total_sets' | 'landmarks'>): RangeGeometry {
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

// Axis labels for the large range bar: landmarks that sit on (or next to) each other share one
// label, e.g. "MV/MEV" when both are 0, so labels never overlap. MAV is labelled at its low end.
export function rangeLabels(marks: RangeMark[], minGapPct = 10): { text: string; pct: number }[] {
  const names: Record<RangeMark['key'], string | null> = { mv: 'MV', mev: 'MEV', mav_low: 'MAV', mav_high: null, mrv: 'MRV' };
  const labels: { text: string; pct: number }[] = [];
  for (const mark of marks) {
    const name = names[mark.key];
    if (!name) continue;
    const last = labels[labels.length - 1];
    if (last && mark.pct - last.pct < minGapPct) last.text = `${last.text}/${name}`;
    else labels.push({ text: name, pct: mark.pct });
  }
  return labels;
}
