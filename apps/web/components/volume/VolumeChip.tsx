import type { Muscle, MuscleVolume } from '@mesocycle/shared';
import { formatSets } from '../../lib/builder/range-geometry';
import { muscleLabel, priorityLabel, STATUS_DESCRIPTION, STATUS_LABEL } from '../../lib/labels';
import { RangeBar } from './RangeBar';

type Props = {
  muscle: Muscle;
  entry: MuscleVolume;
  expanded: boolean;
  controlsId: string;
  onToggle: () => void;
};

// Fixed status styling (SPEC 7.4): tint + border + dark text, never color alone (the status
// name is printed on every chip and repeated in the aria-label).
const STYLE = {
  amber: 'border-status-amber-border bg-status-amber-bg text-status-amber-text',
  lightgreen: 'border-status-lightgreen-border bg-status-lightgreen-bg text-status-lightgreen-text',
  green: 'border-status-green-border bg-status-green-bg text-status-green-text',
  orange: 'border-status-orange-border bg-status-orange-bg text-status-orange-text',
  red: 'border-status-red-border bg-status-red-bg text-status-red-text',
} as const;

export function chipAriaLabel(muscle: Muscle, entry: MuscleVolume): string {
  const days = entry.weekly_frequency === 1 ? '1 day' : `${entry.weekly_frequency} days`;
  return `${muscleLabel(muscle)}: ${formatSets(entry.total_sets)} sets per week. Status ${STATUS_LABEL[entry.status]}, ${STATUS_DESCRIPTION[entry.status]}. Trained directly on ${days} per week. ${priorityLabel(entry.priority)} priority.`;
}

export function VolumeChip({ muscle, entry, expanded, controlsId, onToggle }: Props) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-controls={controlsId}
      aria-label={chipAriaLabel(muscle, entry)}
      data-testid={`volume-chip-${muscle}`}
      data-status={entry.status}
      data-color={entry.color}
      className={`w-36 shrink-0 rounded-md border-2 px-2 py-1 text-left ${STYLE[entry.color]} ${expanded ? 'ring-2 ring-slate-800' : ''}`}
    >
      <span className="flex items-baseline justify-between gap-1">
        <span className="truncate text-xs font-semibold">{muscleLabel(muscle)}</span>
        <span className="text-sm font-bold tabular-nums" data-testid={`volume-total-${muscle}`}>
          {formatSets(entry.total_sets)}
        </span>
      </span>
      <RangeBar entry={entry} className="my-1" />
      <span className="flex items-center justify-between text-[11px] font-medium leading-tight">
        <span data-testid={`volume-status-${muscle}`}>{STATUS_LABEL[entry.status]}</span>
        <span data-testid={`volume-frequency-${muscle}`} title="Days per week with direct sets">
          {entry.weekly_frequency}×/wk
        </span>
      </span>
    </button>
  );
}
