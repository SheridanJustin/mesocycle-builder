'use client';

import {
  MAX_DURATION_WEEKS,
  MIN_DURATION_WEEKS,
  MUSCLE_GROUPS,
  REST_SECONDS,
  WARMUP_MINUTES,
  WORK_SECONDS_PER_SET,
  type GroupVolumeSummary,
  type MuscleGroup,
} from '@mesocycle/shared';
import { useState, type ReactNode } from 'react';
import type { BlockVolume } from '@mesocycle/volume-engine';
import { formatSets } from '../../lib/builder/range-geometry';
import { groupLabel, STATUS_LABEL } from '../../lib/labels';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { InfoPopover } from '../ui/InfoPopover';
import { LandmarkInfo } from '../volume/LandmarkInfo';
import { RangeBar } from '../volume/RangeBar';
import { STATUS_STYLE } from '../volume/VolumeChip';

export type MesocycleSettings = { durationWeeks: number; deloadFinalWeek: boolean };

export type ReviewDay = { name: string; exercises: number; sets: number; minutes: number };

export type ReviewStats = {
  trainingDays: ReviewDay[];
  restDays: string[];
  weeklySets: number;
  deloadWeekSets: number;
  averageMinutes: number;
};

type Props = {
  settings: MesocycleSettings;
  stats: ReviewStats;
  volume: GroupVolumeSummary;
  block: BlockVolume;
  onSettingsChange: (patch: Partial<MesocycleSettings>) => void;
};

const restLabel = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

type StatProps = { label: string; value: string; testId: string; align?: 'left' | 'right'; children: ReactNode };

// A summary tile; hovering or focusing it explains the number.
function Stat({ label, value, testId, align = 'left', children }: StatProps) {
  return (
    <InfoPopover
      label={`${label}: ${value}. How is this calculated?`}
      openOnHover
      align={align}
      testId={`${testId}-info`}
      className="block"
      triggerClassName="block w-full cursor-help rounded-2xl border border-graphite-800 bg-graphite-900/80 px-4 py-2 text-left transition-colors hover:border-aqua-700 focus-visible:border-aqua-500"
      trigger={
        <>
          <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-graphite-500">
            {label}
            <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded-full border border-graphite-700 text-[9px] normal-case">
              i
            </span>
          </span>
          <span className="block text-xl font-semibold tabular-nums text-graphite-50" data-testid={testId}>
            {value}
          </span>
        </>
      }
    >
      <span className="mb-1 block text-sm font-semibold text-graphite-50">{label}</span>
      {children}
    </InfoPopover>
  );
}

function DayRows({ days, value }: { days: ReviewDay[]; value: (day: ReviewDay) => string }) {
  return (
    <span className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 text-graphite-300">
      {days.map((day, index) => (
        <span key={index} className="contents">
          <span className="truncate">{day.name}</span>
          <span className="text-right tabular-nums text-graphite-100">{value(day)}</span>
        </span>
      ))}
    </span>
  );
}

function SummaryTiles({ stats }: { stats: ReviewStats }) {
  const { trainingDays, restDays } = stats;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Training days" value={String(trainingDays.length)} testId="stat-training-days">
        <span className="block">Days with at least one exercise. Each becomes a workout in every week of the mesocycle.</span>
        {trainingDays.length > 0 ? (
          <DayRows days={trainingDays} value={(day) => `${day.exercises} exercise${day.exercises === 1 ? '' : 's'}`} />
        ) : (
          <span className="mt-2 block text-graphite-400">No training days yet.</span>
        )}
      </Stat>
      <Stat label="Rest days" value={String(restDays.length)} testId="stat-rest-days">
        <span className="block">Days without exercises. They stay in the cycle for recovery but create no workouts.</span>
        <span className="mt-2 block text-graphite-300">{restDays.length > 0 ? restDays.join(' · ') : 'None: every day trains.'}</span>
      </Stat>
      <Stat label="Sets per week" value={String(stats.weeklySets)} testId="stat-weekly-sets" align="right">
        <span className="block">
          Every exercise&apos;s sets added up across the week. The volume table below counts per muscle group, where a set also counts
          half for the secondary muscles it works.
        </span>
        {trainingDays.length > 0 && <DayRows days={trainingDays} value={(day) => `${day.sets} sets`} />}
      </Stat>
      <Stat
        label="Avg session"
        value={trainingDays.length ? `~${stats.averageMinutes} min` : '—'}
        testId="stat-average-minutes"
        align="right"
      >
        <span className="block">
          An estimate for each training day: {WARMUP_MINUTES} min warm-up, plus every set × ({WORK_SECONDS_PER_SET} s of work + rest of{' '}
          {restLabel(REST_SECONDS.compound)} for compound lifts or {restLabel(REST_SECONDS.isolation)} for isolation), rounded to 5 min. The tile
          shows the average of your training days.
        </span>
        {trainingDays.length > 0 && <DayRows days={trainingDays} value={(day) => `~${day.minutes} min`} />}
      </Stat>
    </div>
  );
}

// Review: overall volume per major muscle group (weekly and over the whole mesocycle) and the
// mesocycle settings. The review dashboard's lock-in arrives in M8.
const WEEK_OPTIONS = Array.from({ length: MAX_DURATION_WEEKS - MIN_DURATION_WEEKS + 1 }, (_, i) => MIN_DURATION_WEEKS + i);

export function ReviewTab({ settings, stats, volume, block, onSettingsChange }: Props) {
  const [lockInOpen, setLockInOpen] = useState(false);
  const trained = MUSCLE_GROUPS.filter((group) => volume.summary[group]);
  const untrained = MUSCLE_GROUPS.filter((group) => !volume.summary[group]);

  return (
    <section aria-labelledby="review-title" className="mx-auto grid h-full max-w-7xl content-start gap-4 overflow-y-auto px-4 py-4">
      <h2 id="review-title" className="sr-only">
        Review
      </h2>

      <SummaryTiles stats={stats} />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-graphite-800 bg-graphite-900/80 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-graphite-800 px-4 py-2.5">
            <h3 className="flex items-center gap-2 font-semibold">
              Volume by muscle group <LandmarkInfo align="left" />
            </h3>
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

        <div className="grid gap-4 rounded-2xl border border-graphite-800 bg-graphite-900/80 p-4">
          <h3 className="font-semibold">Mesocycle settings</h3>
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-graphite-300">
              Duration <span className="text-graphite-500">· {settings.durationWeeks} weeks</span>
            </legend>
            {/* One radio per length; the row scrolls sideways when it does not fit. Arrow keys move between them. */}
            <div className="mt-1.5 flex snap-x gap-1.5 overflow-x-auto pb-1" data-testid="duration-options">
              {WEEK_OPTIONS.map((weeks) => (
                <label key={weeks} className="shrink-0 snap-start">
                  <input
                    type="radio"
                    name="duration-weeks"
                    value={weeks}
                    className="peer sr-only"
                    checked={settings.durationWeeks === weeks}
                    onChange={() => onSettingsChange({ durationWeeks: weeks })}
                  />
                  <span className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-graphite-700 bg-graphite-950 text-sm font-semibold tabular-nums text-graphite-200 transition-colors hover:border-aqua-600 peer-checked:border-aqua-400 peer-checked:bg-aqua-500 peer-checked:text-graphite-950 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-aqua-400">
                    {weeks}
                    <span className="sr-only"> weeks</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-2 text-sm text-graphite-200">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-aqua-500"
                checked={settings.deloadFinalWeek}
                onChange={(e) => onSettingsChange({ deloadFinalWeek: e.target.checked })}
              />
              Deload in the final week
            </label>
            <InfoPopover label="What does the deload week do?" openOnHover align="right" testId="deload-info">
              <span className="mb-1 block text-sm font-semibold text-graphite-50">Deload week</span>
              <span className="block">
                The last week of the mesocycle is lighter so you recover before the next one. Every exercise drops to <strong>half its sets</strong>{' '}
                (rounded up, e.g. 3 → 2, 4 → 2), keeps the <strong>same rep range</strong>, and goes back to its{' '}
                <strong>Week 1 RIR</strong> instead of pushing closer to failure.
              </span>
              <span className="mt-2 block text-graphite-300" data-testid="deload-example">
                {stats.weeklySets > 0
                  ? `For this mesocycle: ${stats.weeklySets} sets per week → ${stats.deloadWeekSets} sets in the deload week.`
                  : 'Add exercises to see how many sets your deload week would have.'}
              </span>
            </InfoPopover>
          </div>
          <Button variant="primary" size="lg" className="mt-1 w-full" onClick={() => setLockInOpen(true)}>
            Lock in mesocycle
          </Button>
          <p className="text-xs text-graphite-500">Your draft saves automatically.</p>
        </div>
      </div>

      <Dialog open={lockInOpen} title="Lock in mesocycle" onClose={() => setLockInOpen(false)}>
        <p className="text-sm text-graphite-200">
          Lock-in is coming soon. It will freeze this plan and create your workouts for every week of the mesocycle.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setLockInOpen(false)}>Close</Button>
        </div>
      </Dialog>
    </section>
  );
}
