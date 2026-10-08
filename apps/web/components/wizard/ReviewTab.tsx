'use client';

import {
  MAX_DURATION_WEEKS,
  MIN_DURATION_WEEKS,
  upcomingMondays,
  type GroupVolumeSummary,
  type LockMesocycle,
  type ScheduleMode,
} from '@mesocycle/shared';
import { lockWarnings, type BlockVolume } from '@mesocycle/volume-engine';
import { useMemo, useState } from 'react';
import { todayIso } from '../../lib/dates';
import { groupLabel, STATUS_LABEL } from '../../lib/labels';
import { usePreferences } from '../preferences/PreferencesContext';
import { LockInDialog } from '../review/LockInDialog';
import type { ReviewStats } from '../../lib/builder/review-stats';
import { SummaryTiles } from '../review/SummaryTiles';
import { VolumeTable } from '../review/VolumeTable';
import { Button } from '../ui/Button';
import { InfoPopover } from '../ui/InfoPopover';

export type MesocycleSettings = { durationWeeks: number; deloadFinalWeek: boolean };

type Props = {
  settings: MesocycleSettings;
  stats: ReviewStats;
  volume: GroupVolumeSummary;
  block: BlockVolume;
  onSettingsChange: (patch: Partial<MesocycleSettings>) => void;
  mode: ScheduleMode;
  lock: { busy: boolean; error: string | null; activeName: string | null; onConfirm: (body: LockMesocycle) => void; onOpen: () => void };
  // Downloads the schedule as one plain week (PNG), without the mesocycle progression.
  onExportWeek: () => void;
};

// Review: overall volume per major muscle group (weekly and over the whole mesocycle) and the
// mesocycle settings. The review dashboard's lock-in arrives in M8.
const WEEK_OPTIONS = Array.from({ length: MAX_DURATION_WEEKS - MIN_DURATION_WEEKS + 1 }, (_, i) => MIN_DURATION_WEEKS + i);

export function ReviewTab({ settings, stats, volume, block, onSettingsChange, mode, lock, onExportWeek }: Props) {
  const [lockInOpen, setLockInOpen] = useState(false);
  const warnings = lockWarnings(volume);
  const { showRir } = usePreferences();
  // Computed once per visit: this week's Monday and the seven after it.
  const mondays = useMemo(() => upcomingMondays(todayIso(), 8), []);

  return (
    <section aria-labelledby="review-title" className="mx-auto grid h-full max-w-7xl content-start gap-4 overflow-y-auto px-4 py-4">
      <h2 id="review-title" className="sr-only">
        Review
      </h2>

      <SummaryTiles stats={stats} />

      <div className="grid items-start gap-5 lg:grid-cols-3">
        <VolumeTable
          volume={volume}
          block={block}
          durationWeeks={settings.durationWeeks}
          deloadFinalWeek={settings.deloadFinalWeek}
          emptyText="Add exercises on the Build tab to see volume here."
          className="lg:col-span-2"
        />

        <div className="grid gap-4 rounded-2xl border border-graphite-800 bg-graphite-900/80 p-4">
          <h3 className="font-semibold">Mesocycle settings</h3>
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-graphite-300">
              Duration <span className="text-graphite-400">· {settings.durationWeeks} weeks</span>
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
                (rounded up, e.g. 3 → 2, 4 → 2) and keeps the <strong>same rep range</strong>
                {showRir ? (
                  <>
                    , and goes back to its <strong>Week 1 RIR</strong> instead of pushing closer to failure.
                  </>
                ) : (
                  '.'
                )}
              </span>
              <span className="mt-2 block text-graphite-300" data-testid="deload-example">
                {stats.weeklySets > 0
                  ? `For this mesocycle: ${stats.weeklySets} sets per week → ${stats.deloadWeekSets} sets in the deload week.`
                  : 'Add exercises to see how many sets your deload week would have.'}
              </span>
            </InfoPopover>
          </div>
          {warnings.length > 0 && (
            <p className="rounded-lg border border-status-orange-border/70 bg-status-orange-bg px-3 py-2 text-xs text-status-orange-text" data-testid="review-warnings">
              Outside the recommended range:{' '}
              {warnings.map((w) => `${groupLabel(w.group)} (${STATUS_LABEL[w.status].toLowerCase()})`).join(', ')}
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            className="mt-1 w-full"
            disabled={stats.trainingDays.length === 0}
            onClick={() => {
              lock.onOpen();
              setLockInOpen(true);
            }}
          >
            Lock in mesocycle
          </Button>
          <p className="text-xs text-graphite-400">
            {stats.trainingDays.length === 0 ? 'Add at least one exercise to lock in.' : 'Your draft saves automatically.'}
          </p>
          <div className="border-t border-graphite-800 pt-3">
            <Button className="w-full" disabled={stats.trainingDays.length === 0} onClick={onExportWeek}>
              Export week as PNG
            </Button>
            <p className="mt-1.5 text-xs text-graphite-400">Just want a guide? Save your week as an image, without the mesocycle progression.</p>
          </div>
        </div>
      </div>

      <LockInDialog
        open={lockInOpen}
        onClose={() => setLockInOpen(false)}
        mode={mode}
        weeks={settings.durationWeeks}
        deloadFinalWeek={settings.deloadFinalWeek}
        trainingDays={stats.trainingDays.length}
        warnings={warnings}
        mondays={mondays}
        busy={lock.busy}
        error={lock.error}
        activeName={lock.activeName}
        onConfirm={lock.onConfirm}
      />
    </section>
  );
}
