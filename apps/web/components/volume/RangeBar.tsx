import type { GroupVolume } from '@mesocycle/shared';
import { rangeGeometry, rangeLabels } from '../../lib/builder/range-geometry';

type Props = { entry: GroupVolume; size?: 'sm' | 'lg'; showLabels?: boolean; className?: string };

const BAR_COLOR = {
  amber: 'bg-status-amber-bar',
  lightgreen: 'bg-status-lightgreen-bar',
  green: 'bg-status-green-bar',
  orange: 'bg-status-orange-bar',
  red: 'bg-status-red-bar',
} as const;

// Decorative: every fact shown here is also available as text (chip label, popover, Review table).
// The filled bar is the current total in its status color, the shaded zone is MAV, and the ticks
// are MV/MEV/MAV/MRV.
export function RangeBar({ entry, size = 'sm', showLabels = false, className = '' }: Props) {
  const g = rangeGeometry(entry);
  const mark = (key: string) => g.marks.find((m) => m.key === key)?.pct ?? 0;
  const height = size === 'lg' ? 'h-2.5' : 'h-1.5';
  return (
    <div aria-hidden="true" className={className}>
      <div className={`relative ${height} w-full rounded-full bg-graphite-800`}>
        <div className="absolute inset-y-0 bg-status-green-bar/15" style={{ left: `${mark('mav_low')}%`, width: `${mark('mav_high') - mark('mav_low')}%` }} />
        <div className={`absolute inset-y-0 left-0 rounded-full ${BAR_COLOR[entry.color]}`} style={{ width: `${g.valuePct}%` }} />
        {g.marks.map((m) => (
          // Bright, taller than the bar and outlined in dark so the marks read on any fill color.
          <div
            key={m.key}
            data-mark={m.key}
            className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-graphite-50 shadow-[0_0_0_1px_rgb(0_0_0/0.55)]"
            style={{ left: `${m.pct}%` }}
          />
        ))}
      </div>
      {showLabels && (
        <div className="relative mt-1.5 h-3 text-[10px] text-graphite-400">
          {rangeLabels(g.marks).map((label) => (
            <span
              key={label.text}
              // Labels at the very ends align inward so they never hang off the bar.
              className={`absolute whitespace-nowrap ${label.pct < 6 ? '' : label.pct > 94 ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: `${label.pct}%` }}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
