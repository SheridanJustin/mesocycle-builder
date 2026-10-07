'use client';

import { estimateSessionMinutes, type GroupVolumeSummary, type MesocycleDetail } from '@mesocycle/shared';
import type { BlockVolume } from '@mesocycle/volume-engine';
import Link from 'next/link';
import { useState } from 'react';
import type { ReviewStats } from '../../lib/builder/review-stats';
import { initialWeek } from '../../lib/plan';
import { formatIsoDate } from '../../lib/dates';
import { SummaryTiles } from '../review/SummaryTiles';
import { VolumeTable } from '../review/VolumeTable';

type Props = {
  detail: MesocycleDetail;
  stats: ReviewStats;
  volume: GroupVolumeSummary;
  block: BlockVolume;
  // Today's date ("YYYY-MM-DD"); the week containing it is shown first.
  today: string;
};

const STATUS_BADGE: Record<MesocycleDetail['status'], string> = {
  draft: 'bg-graphite-800 text-graphite-200 ring-graphite-700',
  active: 'bg-shamrock-950 text-shamrock-300 ring-shamrock-800',
  completed: 'bg-aqua-950 text-aqua-300 ring-aqua-800',
};

// The read-only view of a locked mesocycle (SPEC 10.1, 10.6): summary, the generated workouts
// week by week, and the volume per muscle group.
export function MesocyclePlan({ detail, stats, volume, block, today }: Props) {
  const [weekNumber, setWeekNumber] = useState(() => initialWeek(detail, today));
  const week = detail.weeks.find((w) => w.week_number === weekNumber) ?? detail.weeks[0];
  const calendar = detail.schedule_mode === 'calendar';

  return (
    <main className="mx-auto h-full max-w-7xl overflow-y-auto px-4 py-5">
      <Link href="/mesocycles" className="text-sm text-graphite-400 hover:text-aqua-300">
        ← My mesocycles
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${STATUS_BADGE[detail.status]}`}>
          {detail.status}
        </span>
      </div>
      <p className="mt-1 text-sm text-graphite-400" data-testid="plan-meta">
        {detail.duration_weeks} weeks · {calendar ? 'Mon–Sun week' : `${detail.days.length}-day cycle`}
        {detail.start_date ? ` · Starts ${formatIsoDate(detail.start_date)}` : ''}
        {detail.deload_final_week ? ` · Week ${detail.duration_weeks} is a deload` : ''}
        {detail.locked_at ? ` · Locked ${formatIsoDate(detail.locked_at.slice(0, 10), 'short')}` : ''}
      </p>
      <p className="mt-1 text-xs text-graphite-500">This plan is locked. Its workouts are below; the days and exercises can no longer be edited.</p>

      <div className="mt-4">
        <SummaryTiles stats={stats} />
      </div>

      <section aria-labelledby="workouts-title" className="mt-5 rounded-2xl border border-graphite-800 bg-graphite-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-graphite-800 px-4 py-2.5">
          <h2 id="workouts-title" className="font-semibold">
            Workouts
          </h2>
          <div role="tablist" aria-label="Weeks" className="flex flex-wrap gap-1">
            {detail.weeks.map((w) => (
              <button
                key={w.id}
                type="button"
                role="tab"
                aria-selected={w.week_number === week?.week_number}
                aria-controls="week-panel"
                data-testid={`week-tab-${w.week_number}`}
                onClick={() => setWeekNumber(w.week_number)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  w.week_number === week?.week_number ? 'bg-aqua-500 text-graphite-950' : 'text-graphite-300 hover:bg-graphite-800 hover:text-graphite-50'
                }`}
              >
                Week {w.week_number}
                {w.is_deload ? ' · Deload' : ''}
              </button>
            ))}
          </div>
        </div>

        {week && (
          <div id="week-panel" role="tabpanel" aria-label={`Week ${week.week_number}`} className="p-4">
            {week.is_deload && (
              <p className="mb-3 text-xs text-graphite-400">Deload week: half the sets (rounded up) and back to the Week 1 RIR so you recover.</p>
            )}
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {week.sessions.map((session) => {
                const minutes = estimateSessionMinutes(
                  session.exercises.map((e) => ({ sets: e.target_sets, movementType: e.exercise.movement_type })),
                );
                return (
                  <li key={session.id} data-testid="session-card" className="rounded-xl border border-graphite-700/80 bg-graphite-800/60 p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold">{session.day_name}</h3>
                      <span className="text-xs text-graphite-400">
                        {session.scheduled_date ? `${formatIsoDate(session.scheduled_date, 'short')} · ` : ''}~{minutes} min
                      </span>
                    </div>
                    <ol className="mt-2 grid gap-1.5 text-sm">
                      {session.exercises.map((item) => (
                        <li key={item.id} data-testid="session-exercise" className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate text-graphite-100">{item.exercise.name}</span>
                          <span className="shrink-0 tabular-nums text-graphite-300">
                            {item.target_sets} × {item.rep_range_min}–{item.rep_range_max} · RIR {item.target_rir}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <VolumeTable
        volume={volume}
        block={block}
        durationWeeks={detail.duration_weeks}
        deloadFinalWeek={detail.deload_final_week}
        emptyText="No exercises in this mesocycle."
        className="mt-5"
      />
    </main>
  );
}
