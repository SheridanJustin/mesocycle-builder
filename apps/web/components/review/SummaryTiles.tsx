'use client';

import { REST_SECONDS, WARMUP_MINUTES, WORK_SECONDS_PER_SET } from '@mesocycle/shared';
import type { ReactNode } from 'react';
import type { ReviewDay, ReviewStats } from '../../lib/builder/review-stats';
import { InfoPopover } from '../ui/InfoPopover';

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

export function SummaryTiles({ stats }: { stats: ReviewStats }) {
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

