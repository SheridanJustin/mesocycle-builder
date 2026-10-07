import type { VolumeColor } from '@mesocycle/shared';
import { InfoPopover } from '../ui/InfoPopover';
import { STATUS_STYLE } from './VolumeChip';

// Plain-language definitions of the volume landmarks, for beginners.
export const LANDMARK_DEFINITIONS = [
  { term: 'MV', name: 'Maintenance Volume', text: '~6 sets per week maintains current muscle mass', color: 'amber' },
  { term: 'MEV', name: 'Minimum Effective Volume', text: 'Starting point for growth, varies by training experience', color: 'lightgreen' },
  { term: 'MAV', name: 'Maximum Adaptive Volume', text: 'Sweet spot range between MEV and MRV for optimal gains', color: 'green' },
  { term: 'MRV', name: 'Maximum Recoverable Volume', text: 'Upper limit before recovery fails and gains stop', color: 'red' },
] as const satisfies readonly { term: string; name: string; text: string; color: VolumeColor }[];

// The status colors (SPEC 7.4) in weekly-set order, as on the chips.
export const VOLUME_ZONES: readonly { label: string; color: VolumeColor }[] = [
  { label: 'Below MEV', color: 'amber' },
  { label: 'MEV to MAV', color: 'lightgreen' },
  { label: 'In MAV', color: 'green' },
  { label: 'Above MAV', color: 'orange' },
  { label: 'Over MRV', color: 'red' },
];

export function LandmarkInfo({ align = 'right' }: { align?: 'left' | 'right' }) {
  return (
    <InfoPopover label="What do MV, MEV, MAV and MRV mean?" align={align} testId="landmark-info">
      <span className="mb-2 block text-sm font-semibold text-graphite-50">Weekly volume landmarks</span>
      <span className="grid gap-2">
        {LANDMARK_DEFINITIONS.map((d) => (
          <span key={d.term} className="block">
            <span className={`rounded border px-1 font-semibold ${STATUS_STYLE[d.color]}`} data-color={d.color}>
              {d.term}
            </span>{' '}
            <span className="font-semibold text-graphite-100">({d.name}):</span>{' '}
            {d.text}
          </span>
        ))}
      </span>
      <span className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-graphite-400">Chip and number colors</span>
      <span className="mt-1 flex flex-wrap gap-1" data-testid="volume-zones">
        {VOLUME_ZONES.map((zone) => (
          <span key={zone.label} className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[zone.color]}`}>
            {zone.label}
          </span>
        ))}
      </span>
      <span className="mt-2 block text-graphite-300" data-testid="landmark-info-varies">
        Values differ per muscle: muscles worked hard by compound lifts (shoulders, abs, glutes) need little or no direct work to maintain.
      </span>
      <span className="mt-2 block text-graphite-400">Volume means hard working sets per muscle group per week.</span>
    </InfoPopover>
  );
}
