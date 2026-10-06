import type { MuscleVolume } from '@mesocycle/shared';
import { rangeGeometry } from '../../lib/builder/range-geometry';

type Props = { entry: MuscleVolume; className?: string };

const BAR_COLOR = {
  amber: 'bg-status-amber-bar',
  lightgreen: 'bg-status-lightgreen-bar',
  green: 'bg-status-green-bar',
  orange: 'bg-status-orange-bar',
  red: 'bg-status-red-bar',
} as const;

// Decorative: every fact shown here is also available as text (chip label and popover).
// The filled bar is the current total in its status color, the ticks are MV/MEV/MAV/MRV and the
// outlined band is the priority target band.
export function RangeBar({ entry, className = '' }: Props) {
  const g = rangeGeometry(entry);
  return (
    <div aria-hidden="true" className={`relative h-3 w-full rounded-sm bg-white/70 ring-1 ring-slate-400 ${className}`}>
      <div className={`absolute inset-y-0 left-0 rounded-sm ${BAR_COLOR[entry.color]}`} style={{ width: `${g.valuePct}%` }} />
      <div
        data-testid="target-band"
        className="absolute inset-y-0 border-x-2 border-t-2 border-slate-800"
        style={{ left: `${g.bandLeftPct}%`, width: `${g.bandWidthPct}%`, top: -3, borderBottomWidth: 0, height: 5 }}
      />
      {g.marks.map((mark) => (
        <div key={mark.key} data-mark={mark.key} className="absolute inset-y-0 w-px bg-slate-700" style={{ left: `${mark.pct}%` }} />
      ))}
    </div>
  );
}
