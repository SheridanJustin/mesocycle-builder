import { InfoPopover } from '../ui/InfoPopover';

// Plain-language definitions of the volume landmarks, for beginners.
export const LANDMARK_DEFINITIONS = [
  { term: 'MV', name: 'Maintenance Volume', text: '~6 sets per week maintains current muscle mass' },
  { term: 'MEV', name: 'Minimum Effective Volume', text: 'Starting point for growth, varies by training experience' },
  { term: 'MAV', name: 'Maximum Adaptive Volume', text: 'Sweet spot range between MEV and MRV for optimal gains' },
  { term: 'MRV', name: 'Maximum Recoverable Volume', text: 'Upper limit before recovery fails and gains stop' },
] as const;

export function LandmarkInfo({ align = 'right' }: { align?: 'left' | 'right' }) {
  return (
    <InfoPopover label="What do MV, MEV, MAV and MRV mean?" align={align} testId="landmark-info">
      <span className="mb-2 block text-sm font-semibold text-graphite-50">Weekly volume landmarks</span>
      <span className="grid gap-2">
        {LANDMARK_DEFINITIONS.map((d) => (
          <span key={d.term} className="block">
            <span className="font-semibold text-aqua-300">
              {d.term} ({d.name}):
            </span>{' '}
            {d.text}
          </span>
        ))}
      </span>
      <span className="mt-2 block text-graphite-400">Volume means hard working sets per muscle group per week.</span>
    </InfoPopover>
  );
}
