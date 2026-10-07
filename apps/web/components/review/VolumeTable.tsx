import { MUSCLE_GROUPS, type GroupVolumeSummary, type MuscleGroup } from '@mesocycle/shared';
import type { BlockVolume } from '@mesocycle/volume-engine';
import { formatSets } from '../../lib/builder/range-geometry';
import { groupLabel, STATUS_LABEL } from '../../lib/labels';
import { LandmarkInfo } from '../volume/LandmarkInfo';
import { RangeBar } from '../volume/RangeBar';
import { STATUS_STYLE } from '../volume/VolumeChip';

type Props = {
  volume: GroupVolumeSummary;
  block: BlockVolume;
  durationWeeks: number;
  deloadFinalWeek: boolean;
  emptyText: string;
  className?: string;
};

// Weekly sets per major muscle group against its landmarks, plus the total over the mesocycle.
export function VolumeTable({ volume, block, durationWeeks, deloadFinalWeek, emptyText, className = '' }: Props) {
  const trained = MUSCLE_GROUPS.filter((group) => volume.summary[group]);
  const untrained = MUSCLE_GROUPS.filter((group) => !volume.summary[group]);
  return (
    <div className={`rounded-2xl border border-graphite-800 bg-graphite-900/80 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-graphite-800 px-4 py-2.5">
        <h3 className="flex items-center gap-2 font-semibold">
          Volume by muscle group <LandmarkInfo align="left" />
        </h3>
        <p className="text-xs text-graphite-500">
          Weekly sets against MV · MEV · MAV · MRV, and total sets over {durationWeeks} weeks
          {deloadFinalWeek ? ' (final week deloaded)' : ''}
        </p>
      </div>

      {trained.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-graphite-400">{emptyText}</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-graphite-500">
              <th scope="col" className="px-4 py-1.5 font-semibold">
                Group
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                Weekly
              </th>
              <th scope="col" className="hidden w-2/5 px-3 py-2 font-semibold sm:table-cell">
                <span className="sr-only">Range</span>
              </th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {trained.map((group: MuscleGroup) => {
              const entry = volume.summary[group]!;
              const total = block[group]?.block ?? 0;
              return (
                <tr key={group} data-testid={`review-row-${group}`} className="border-t border-graphite-800/80">
                  <th scope="row" className="px-4 py-1.5 text-left font-medium">
                    {groupLabel(group)}
                    <span className="ml-1.5 text-[11px] font-normal text-graphite-500">{entry.weekly_frequency}×/wk</span>
                  </th>
                  <td className="whitespace-nowrap px-2 py-1.5 text-right">
                    <span className="text-base font-semibold tabular-nums" data-testid={`review-weekly-${group}`}>
                      {formatSets(entry.total_sets)}
                    </span>
                    <span
                      data-testid={`review-status-${group}`}
                      className={`ml-2 hidden rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide md:inline ${STATUS_STYLE[entry.color]}`}
                    >
                      {STATUS_LABEL[entry.status]}
                    </span>
                  </td>
                  <td className="hidden px-3 py-1.5 sm:table-cell">
                    <RangeBar entry={entry} size="lg" showLabels />
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-graphite-200" data-testid={`review-block-${group}`}>
                    {formatSets(Math.round(total * 2) / 2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {trained.length > 0 && untrained.length > 0 && (
        <p className="border-t border-graphite-800 px-4 py-2 text-xs text-graphite-500" data-testid="review-untrained">
          Not trained: {untrained.map(groupLabel).join(', ')}
        </p>
      )}
    </div>
  );
}
