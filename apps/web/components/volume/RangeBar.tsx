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
// The filled bar is the current total in its status color; the ticks are MV/MEV/MAV/MRV.
// (Priority target bands are hidden for now; see SPEC 7.5.)
export function RangeBar({ entry, className = '' }: Props) {
  const g = rangeGeometry(entry);
  return (
    <div aria-hidden="true" className={`relative h-3 w-full rounded-sm bg-graphite-950/70 ring-1 ring-graphite-600 ${className}`}>
      <div className={`absolute inset-y-0 left-0 rounded-sm ${BAR_COLOR[entry.color]}`} style={{ width: `${g.valuePct}%` }} />
      {g.marks.map((mark) => (
        <div key={mark.key} data-mark={mark.key} className="absolute inset-y-0 w-px bg-graphite-200" style={{ left: `${mark.pct}%` }} />
      ))}
    </div>
  );
}
