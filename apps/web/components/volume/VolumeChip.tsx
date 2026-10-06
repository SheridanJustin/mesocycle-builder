import type { GroupVolume, MuscleGroup } from '@mesocycle/shared';
import { formatSets } from '../../lib/builder/range-geometry';
import { groupLabel, STATUS_DESCRIPTION, STATUS_LABEL } from '../../lib/labels';
import { RangeBar } from './RangeBar';

type Props = {
  group: MuscleGroup;
  entry: GroupVolume;
  expanded: boolean;
  controlsId: string;
  onToggle: () => void;
};

// Fixed status styling (SPEC 7.4): tint + border + light text, never color alone (the status
// name is printed on every chip and repeated in the aria-label).
export const STATUS_STYLE = {
  amber: 'border-status-amber-border bg-status-amber-bg text-status-amber-text',
  lightgreen: 'border-status-lightgreen-border bg-status-lightgreen-bg text-status-lightgreen-text',
  green: 'border-status-green-border bg-status-green-bg text-status-green-text',
  orange: 'border-status-orange-border bg-status-orange-bg text-status-orange-text',
  red: 'border-status-red-border bg-status-red-bg text-status-red-text',
} as const;

export function chipAriaLabel(group: MuscleGroup, entry: GroupVolume): string {
  const days = entry.weekly_frequency === 1 ? '1 day' : `${entry.weekly_frequency} days`;
  return `${groupLabel(group)}: ${formatSets(entry.total_sets)} sets per week. Status ${STATUS_LABEL[entry.status]}, ${STATUS_DESCRIPTION[entry.status]}. Trained directly on ${days} per week.`;
}

export function VolumeChip({ group, entry, expanded, controlsId, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={chipAriaLabel(group, entry)}
      data-testid={`volume-chip-${group}`}
      data-status={entry.status}
      data-color={entry.color}
      className={`w-full min-w-0 rounded-lg border px-2 py-1.5 text-left transition-transform hover:-translate-y-px ${STATUS_STYLE[entry.color]} ${
        expanded ? 'ring-2 ring-aqua-400' : ''
      }`}
    >
      <span className="flex items-baseline justify-between gap-1">
        <span className="truncate text-xs font-semibold">{groupLabel(group)}</span>
        <span className="text-sm font-bold tabular-nums" data-testid={`volume-total-${group}`}>
          {formatSets(entry.total_sets)}
        </span>
      </span>
      <RangeBar entry={entry} className="my-1" />
      <span className="flex items-center justify-between gap-1 text-[10px] font-medium opacity-90">
        <span data-testid={`volume-status-${group}`} className="truncate">
          {STATUS_LABEL[entry.status]}
        </span>
        <span data-testid={`volume-frequency-${group}`} title="Days per week with direct sets" className="shrink-0">
          {entry.weekly_frequency}×/wk
        </span>
      </span>
    </button>
  );
}
