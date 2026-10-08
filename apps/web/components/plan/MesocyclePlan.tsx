'use client';

import { estimateSessionMinutes, MAX_DURATION_WEEKS, type GroupVolumeSummary, type MesocycleDetail, type SessionDetail, type UpdateSession } from '@mesocycle/shared';
import type { BlockVolume } from '@mesocycle/volume-engine';
import Link from 'next/link';
import { useState } from 'react';
import type { ReviewStats } from '../../lib/builder/review-stats';
import { formatIsoDate } from '../../lib/dates';
import { initialWeek, planDays, progress, type PlanDay } from '../../lib/plan';
import { usePreferences } from '../preferences/PreferencesContext';
import { SummaryTiles } from '../review/SummaryTiles';
import { VolumeTable } from '../review/VolumeTable';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ExtendDialog } from './ExtendDialog';
import { StatusBadge } from '../ui/StatusBadge';

type Props = {
  detail: MesocycleDetail;
  stats: ReviewStats;
  volume: GroupVolumeSummary;
  block: BlockVolume;
  // Today's date ("YYYY-MM-DD"); the week containing it is shown first and its day is marked.
  today: string;
  // Workouts being saved; their buttons are disabled meanwhile.
  pendingSessionIds: ReadonlySet<string>;
  error: string | null;
  onSetStatus: (sessionId: string, status: UpdateSession['status']) => void;
  onDrop: () => void;
  onResume: () => void;
  // Resolves once the request finished (the dialog closes on success).
  onExtend: (weeks: number) => Promise<boolean>;
  onExport: () => void;
};

const SESSION_BADGE: Record<SessionDetail['status'], string> = {
  planned: '',
  in_progress: 'bg-aqua-950 text-aqua-300 ring-aqua-800',
  completed: 'bg-shamrock-950 text-shamrock-300 ring-shamrock-800',
  skipped: 'bg-graphite-800 text-graphite-300 ring-graphite-600',
};

const linkButton = 'inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-medium transition-colors';

function WorkoutActions({ session, href, editable, busy, onSetStatus }: { session: SessionDetail; href: string; editable: boolean; busy: boolean; onSetStatus: Props['onSetStatus'] }) {
  const done = session.status === 'completed' || session.status === 'skipped';
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {(done || session.status === 'in_progress') && (
        <span data-testid="session-status" className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${SESSION_BADGE[session.status]}`}>
          {session.status === 'completed' ? '✓ Completed' : session.status === 'skipped' ? 'Skipped' : 'In progress'}
        </span>
      )}
      {editable && !done && (
        <>
          <Link href={href} className={`${linkButton} bg-aqua-500 text-graphite-950 hover:bg-aqua-400`}>
            {session.status === 'in_progress' ? 'Continue workout' : 'Start workout'}
          </Link>
          <Button size="sm" disabled={busy} onClick={() => onSetStatus(session.id, 'skipped')}>
            Skip
          </Button>
        </>
      )}
      {session.status === 'completed' && (
        <Link href={href} className="text-xs font-medium text-aqua-300 underline-offset-2 hover:underline">
          {editable ? 'View or edit log' : 'View log'}
        </Link>
      )}
      {editable && done && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onSetStatus(session.id, 'planned')}
          className="text-xs font-medium text-graphite-400 underline-offset-2 hover:text-graphite-100 hover:underline"
        >
          Undo
        </button>
      )}
    </div>
  );
}

function DayCard({ day, mesocycleId, today, editable, pendingSessionIds, onSetStatus }: { day: PlanDay; mesocycleId: string; today: string; editable: boolean; pendingSessionIds: ReadonlySet<string>; onSetStatus: Props['onSetStatus'] }) {
  const { showRir } = usePreferences();
  const isToday = day.date === today;
  const ring = isToday ? 'ring-2 ring-aqua-500' : '';
  const dateLabel = day.date ? formatIsoDate(day.date, 'short') : null;

  if (day.kind === 'rest') {
    return (
      <li data-testid="rest-card" className={`rounded-xl border border-dashed border-graphite-700 bg-graphite-900/40 p-3 ${ring}`}>
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-semibold text-graphite-300">{day.name}</h3>
          <span className="text-xs text-graphite-400">
            {isToday ? 'Today · ' : ''}
            {dateLabel}
          </span>
        </div>
        <p className="mt-2 text-xs font-medium uppercase tracking-wider text-graphite-400">Rest day</p>
        <p className="mt-1 text-xs text-graphite-400">No workout: recover.</p>
      </li>
    );
  }

  const { session } = day;
  const minutes = estimateSessionMinutes(session.exercises.map((e) => ({ sets: e.target_sets, movementType: e.exercise.movement_type })));
  const finished = session.status === 'completed' || session.status === 'skipped';
  return (
    <li
      data-testid="session-card"
      data-status={session.status}
      className={`rounded-xl border border-graphite-700/80 p-3 ${finished ? 'bg-graphite-900/60 opacity-80' : 'bg-graphite-800/60'} ${ring}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{day.name}</h3>
        <span className="text-xs text-graphite-400">
          {isToday ? 'Today · ' : ''}
          {dateLabel ? `${dateLabel} · ` : ''}~{minutes} min
        </span>
      </div>
      <ol className="mt-2 grid gap-1.5 text-sm">
        {session.exercises.map((item) => (
          <li key={item.id} data-testid="session-exercise" className="flex items-baseline justify-between gap-2">
            <span className={`min-w-0 truncate ${session.status === 'skipped' ? 'text-graphite-400 line-through' : 'text-graphite-100'}`}>{item.exercise.name}</span>
            <span className="shrink-0 tabular-nums text-graphite-300">
              {item.target_sets} × {item.rep_range_min}–{item.rep_range_max}
              {showRir ? ` · RIR ${item.target_rir}` : ''}
            </span>
          </li>
        ))}
      </ol>
      <WorkoutActions session={session} href={`/mesocycles/${mesocycleId}/workouts/${session.id}`} editable={editable} busy={pendingSessionIds.has(session.id)} onSetStatus={onSetStatus} />
    </li>
  );
}

// The view of a locked mesocycle (SPEC 10.1, 10.6): summary, every week day by day (workouts you can
// start and log, or skip, and rest days), and the volume per muscle group. Active ones can be dropped.
export function MesocyclePlan({ detail, stats, volume, block, today, pendingSessionIds, error, onSetStatus, onDrop, onResume, onExtend, onExport }: Props) {
  const [weekNumber, setWeekNumber] = useState(() => initialWeek(detail, today));
  const [confirmingDrop, setConfirmingDrop] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendBusy, setExtendBusy] = useState(false);
  const canExtend = (detail.status === 'active' || detail.status === 'paused' || detail.status === 'completed') && detail.duration_weeks < MAX_DURATION_WEEKS;
  const week = detail.weeks.find((w) => w.week_number === weekNumber) ?? detail.weeks[0];
  const calendar = detail.schedule_mode === 'calendar';
  // Workouts can be ticked off while active; a completed mesocycle can still undo its last ones.
  const editable = detail.status === 'active' || detail.status === 'completed';
  const { done, total } = progress(detail);
  const { showRir } = usePreferences();

  return (
    <main className="mx-auto h-full max-w-7xl overflow-y-auto px-4 py-5">
      <Link href="/mesocycles" className="text-sm text-graphite-400 hover:text-aqua-300">
        ← My mesocycles
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{detail.name}</h1>
            <StatusBadge status={detail.status} />
          </div>
          <p className="mt-1 text-sm text-graphite-400" data-testid="plan-meta">
            {detail.duration_weeks} weeks · {calendar ? 'Mon–Sun week' : `${detail.days.length}-day cycle`}
            {detail.start_date ? ` · Starts ${formatIsoDate(detail.start_date)}` : ''}
            {detail.deload_final_week ? ` · Week ${detail.duration_weeks} is a deload` : ''}
            {detail.locked_at ? ` · Locked ${formatIsoDate(detail.locked_at.slice(0, 10), 'short')}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onExport}>Export week as PNG</Button>
          {canExtend && <Button onClick={() => setExtending(true)}>Extend</Button>}
          {detail.status === 'paused' && (
            <Button variant="primary" onClick={onResume}>
              Resume mesocycle
            </Button>
          )}
          {(detail.status === 'active' || detail.status === 'paused') && (
            <button
              type="button"
              onClick={() => setConfirmingDrop(true)}
              className="inline-flex items-center rounded-lg border border-snow-600 bg-snow-900/70 px-3 py-2 text-sm font-medium text-snow-100 transition-colors hover:border-snow-400 hover:bg-snow-700"
            >
              Drop mesocycle
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3" data-testid="plan-progress">
        <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-graphite-800" aria-hidden="true">
          <div className="h-full rounded-full bg-shamrock-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
        <span className="text-sm text-graphite-300">
          {done} of {total} workouts done
        </span>
      </div>

      {detail.status === 'completed' && (
        <p role="status" className="mt-3 rounded-xl border border-shamrock-800 bg-shamrock-950 p-3 text-sm text-shamrock-200">
          Mesocycle complete — every workout is done or skipped. It&apos;s now in your archive.
        </p>
      )}
      {detail.status === 'paused' && (
        <p role="status" className="mt-3 rounded-xl border border-verdigris-800 bg-verdigris-950 p-3 text-sm text-verdigris-200">
          Paused: another mesocycle is running. Resume this one to keep tracking its workouts (the other one will be paused).
        </p>
      )}
      {detail.status === 'dropped' && (
        <p role="status" className="mt-3 rounded-xl border border-snow-800 bg-snow-950 p-3 text-sm text-snow-200">
          You dropped this mesocycle{detail.ended_at ? ` on ${formatIsoDate(detail.ended_at.slice(0, 10))}` : ''}. It&apos;s in your archive.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
          {error}
        </p>
      )}

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
                data-complete={w.is_complete}
                onClick={() => setWeekNumber(w.week_number)}
                className={`rounded-lg px-3 py-1 text-sm font-medium transition-colors ${
                  w.week_number === week?.week_number ? 'bg-aqua-500 text-graphite-950' : 'text-graphite-300 hover:bg-graphite-800 hover:text-graphite-50'
                }`}
              >
                Week {w.week_number}
                {w.is_deload ? ' · Deload' : ''}
                {w.is_complete && (
                  <>
                    <span aria-hidden="true"> ✓</span>
                    <span className="sr-only">, complete</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {week && (
          <div id="week-panel" role="tabpanel" aria-label={`Week ${week.week_number}`} className="p-4">
            {week.is_complete && (
              <p data-testid="week-complete" className="mb-3 rounded-lg border border-shamrock-800 bg-shamrock-950 px-3 py-2 text-sm text-shamrock-200">
                ✓ Week {week.week_number} complete.
              </p>
            )}
            {week.is_deload && (
              <p className="mb-3 text-xs text-graphite-400">Deload week: half the sets (rounded up){showRir ? ' and back to the Week 1 RIR' : ''} so you recover.</p>
            )}
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
              {planDays(detail, week).map((day) => (
                <DayCard key={day.dayId} day={day} mesocycleId={detail.id} today={today} editable={editable} pendingSessionIds={pendingSessionIds} onSetStatus={onSetStatus} />
              ))}
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

      {extending && (
        <ExtendDialog
          open
          detail={detail}
          busy={extendBusy}
          onClose={() => setExtending(false)}
          onExtend={(weeks) => {
            setExtendBusy(true);
            void onExtend(weeks).then((ok) => {
              setExtendBusy(false);
              if (ok) setExtending(false);
            });
          }}
        />
      )}

      <ConfirmDialog
        open={confirmingDrop}
        title="Drop this mesocycle?"
        message="It stops here and moves to your archive. Workouts you completed stay recorded. This can't be undone."
        confirmLabel="Drop mesocycle"
        onConfirm={() => {
          setConfirmingDrop(false);
          onDrop();
        }}
        onCancel={() => setConfirmingDrop(false)}
      />
    </main>
  );
}
