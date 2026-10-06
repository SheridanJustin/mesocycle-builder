'use client';

import { MAX_DURATION_WEEKS, MIN_DURATION_WEEKS, MUSCLE_GROUPS, type GroupVolumeSummary, type MuscleGroup } from '@mesocycle/shared';
import type { BlockVolume } from '@mesocycle/volume-engine';
import { formatSets } from '../../lib/builder/range-geometry';
import { groupLabel, STATUS_LABEL } from '../../lib/labels';
import { InlineText } from '../ui/InlineText';
import { RangeBar } from '../volume/RangeBar';
import { STATUS_STYLE } from '../volume/VolumeChip';

export type MesocycleSettings = { name: string; durationWeeks: number; deloadFinalWeek: boolean };

export type ReviewStats = { trainingDays: number; restDays: number; weeklySets: number; averageMinutes: number };

type Props = {
  settings: MesocycleSettings;
  stats: ReviewStats;
  volume: GroupVolumeSummary;
  block: BlockVolume;
  onSettingsChange: (patch: Partial<MesocycleSettings>) => void;
};

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-2xl border border-graphite-800 bg-graphite-900/80 px-4 py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-graphite-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums" data-testid={testId}>
        {value}
      </dd>
    </div>
  );
}

// Review: overall volume per major muscle group (weekly and over the whole block) and the block
// settings. The review dashboard's lock-in arrives in M8.
export function ReviewTab({ settings, stats, volume, block, onSettingsChange }: Props) {
  const trained = MUSCLE_GROUPS.filter((group) => volume.summary[group]);
  const untrained = MUSCLE_GROUPS.filter((group) => !volume.summary[group]);
  const field = 'mt-1 block w-full rounded-lg border border-graphite-700 bg-graphite-950 px-2.5 py-2 text-sm text-graphite-50';

  return (
    <section aria-labelledby="review-title" className="mx-auto grid max-w-7xl gap-5 px-4 py-6">
      <h2 id="review-title" className="sr-only">
        Review
      </h2>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Training days" value={String(stats.trainingDays)} testId="stat-training-days" />
        <Stat label="Rest days" value={String(stats.restDays)} testId="stat-rest-days" />
        <Stat label="Sets per week" value={String(stats.weeklySets)} testId="stat-weekly-sets" />
        <Stat label="Avg session" value={stats.trainingDays ? `~${stats.averageMinutes} min` : '—'} testId="stat-average-minutes" />
      </dl>

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-graphite-800 bg-graphite-900/80 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-graphite-800 px-4 py-3">
            <h3 className="font-semibold">Volume by muscle group</h3>
            <p className="text-xs text-graphite-500">
              Weekly sets against MV · MEV · MAV · MRV, and total sets over {settings.durationWeeks} weeks
              {settings.deloadFinalWeek ? ' (final week deloaded)' : ''}
            </p>
          </div>

          {trained.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-graphite-400">Add exercises on the Build tab to see volume here.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-graphite-500">
                  <th scope="col" className="px-4 py-2 font-semibold">
                    Group
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">
                    Weekly
                  </th>
                  <th scope="col" className="hidden w-2/5 px-3 py-2 font-semibold sm:table-cell">
                    <span className="sr-only">Range</span>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right font-semibold">
                    Block
                  </th>
                </tr>
              </thead>
              <tbody>
                {trained.map((group: MuscleGroup) => {
                  const entry = volume.summary[group]!;
                  const total = block[group]?.block ?? 0;
                  return (
                    <tr key={group} data-testid={`review-row-${group}`} className="border-t border-graphite-800/80">
                      <th scope="row" className="px-4 py-2.5 text-left font-medium">
                        {groupLabel(group)}
                        <span className="block text-[11px] font-normal text-graphite-500">{entry.weekly_frequency}× per week</span>
                      </th>
                      <td className="px-2 py-2.5 text-right">
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
                      <td className="hidden px-3 py-2.5 sm:table-cell">
                        <RangeBar entry={entry} size="lg" showLabels />
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-graphite-200" data-testid={`review-block-${group}`}>
                        {formatSets(Math.round(total * 2) / 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {trained.length > 0 && untrained.length > 0 && (
            <p className="border-t border-graphite-800 px-4 py-3 text-xs text-graphite-500" data-testid="review-untrained">
              Not trained: {untrained.map(groupLabel).join(', ')}
            </p>
          )}
        </div>

        <div className="grid gap-4 rounded-2xl border border-graphite-800 bg-graphite-900/80 p-4">
          <h3 className="font-semibold">Block settings</h3>
          <label className="block text-sm font-medium text-graphite-300">
            Mesocycle name
            <InlineText
              ariaLabel="Mesocycle name"
              value={settings.name}
              maxLength={255}
              onCommit={(name) => onSettingsChange({ name })}
              className="mt-1 w-full border-graphite-700 bg-graphite-950 py-2"
            />
          </label>
          <label className="block text-sm font-medium text-graphite-300">
            Duration
            <select className={field} value={settings.durationWeeks} onChange={(e) => onSettingsChange({ durationWeeks: Number(e.target.value) })}>
              {Array.from({ length: MAX_DURATION_WEEKS - MIN_DURATION_WEEKS + 1 }, (_, i) => MIN_DURATION_WEEKS + i).map((n) => (
                <option key={n} value={n}>
                  {n} weeks
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-graphite-200">
            <input
              type="checkbox"
              className="h-4 w-4 accent-aqua-500"
              checked={settings.deloadFinalWeek}
              onChange={(e) => onSettingsChange({ deloadFinalWeek: e.target.checked })}
            />
            Deload in the final week
          </label>
          <p className="rounded-xl bg-graphite-950/60 p-3 text-xs text-graphite-400">
            Lock-in, which freezes the plan and creates your weekly workouts, arrives in the next milestone. Your draft saves automatically.
          </p>
        </div>
      </div>
    </section>
  );
}
