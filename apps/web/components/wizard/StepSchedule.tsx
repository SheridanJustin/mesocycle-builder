'use client';

import { MAX_DAYS_PER_WEEK, MAX_DURATION_WEEKS, MIN_DURATION_WEEKS, type ScheduleMode } from '@mesocycle/shared';
import { useState } from 'react';
import { WEEKDAY_NAMES } from '../../lib/days';
import type { BuilderDay } from '../../lib/builder/types';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InlineText } from '../ui/InlineText';

export type MesocycleSettings = { name: string; durationWeeks: number; deloadFinalWeek: boolean };

type Props = {
  settings: MesocycleSettings;
  mode: ScheduleMode;
  days: BuilderDay[];
  onSettingsChange: (patch: Partial<MesocycleSettings>) => void;
  onRenameDay: (dayId: string, name: string) => void;
  onSetWeekday: (dayId: string, weekday: number | null) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
};

const select = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';

// Step 1: choose the training days.
export function StepSchedule({ settings, mode, days, onSettingsChange, onRenameDay, onSetWeekday, onAddDay, onRemoveDay }: Props) {
  const [pendingRemove, setPendingRemove] = useState<BuilderDay | null>(null);
  const takenWeekdays = new Set(days.flatMap((d) => (d.weekday === null ? [] : [d.weekday])));

  function requestRemove(day: BuilderDay) {
    if (day.muscles.length === 0 && day.slots.length === 0) onRemoveDay(day.id);
    else setPendingRemove(day);
  }

  return (
    <section aria-labelledby="step-schedule-title" className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
      <div>
        <h2 id="step-schedule-title" className="text-xl font-semibold">
          1. Schedule
        </h2>
        <p className="text-sm text-slate-600">Name your block and choose its training days. Days repeat every week of the block.</p>
      </div>

      <div className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Mesocycle name
          <InlineText
            ariaLabel="Mesocycle name"
            value={settings.name}
            maxLength={255}
            onCommit={(name) => onSettingsChange({ name })}
            className="mt-1 w-full border-slate-300 bg-white"
          />
        </label>
        <label className="block text-sm font-medium">
          Duration
          <select
            className={`${select} mt-1 block w-full`}
            value={settings.durationWeeks}
            onChange={(e) => onSettingsChange({ durationWeeks: Number(e.target.value) })}
          >
            {Array.from({ length: MAX_DURATION_WEEKS - MIN_DURATION_WEEKS + 1 }, (_, i) => MIN_DURATION_WEEKS + i).map((n) => (
              <option key={n} value={n}>
                {n} weeks
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={settings.deloadFinalWeek} onChange={(e) => onSettingsChange({ deloadFinalWeek: e.target.checked })} />
          Deload in the final week
        </label>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-medium">Training days ({days.length})</h3>
        <ul className="grid gap-2">
          {days.map((day, index) => (
            <li key={day.id} className="flex flex-wrap items-center gap-2">
              <span className="w-6 text-sm text-slate-500">{index + 1}.</span>
              <InlineText
                ariaLabel={`Day ${index + 1} name`}
                value={day.name}
                onCommit={(name) => onRenameDay(day.id, name)}
                className="min-w-0 flex-1 border-slate-300 bg-white"
              />
              {mode === 'calendar' && (
                <select
                  aria-label={`Day ${index + 1} weekday`}
                  className={select}
                  value={day.weekday ?? ''}
                  onChange={(e) => onSetWeekday(day.id, e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">Weekday…</option>
                  {WEEKDAY_NAMES.map((label, value) => (
                    <option key={label} value={value} disabled={takenWeekdays.has(value) && day.weekday !== value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              <Button size="sm" variant="ghost" aria-label={`Remove day ${index + 1}`} disabled={days.length <= 1} onClick={() => requestRemove(day)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={onAddDay} disabled={days.length >= MAX_DAYS_PER_WEEK}>
            Add day
          </Button>
          {days.length >= MAX_DAYS_PER_WEEK && (
            <span className="text-sm text-slate-600">Up to {MAX_DAYS_PER_WEEK} days; a 7th day is possible by duplicating a day on the board.</span>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this day?"
        message={`“${pendingRemove?.name ?? ''}” has ${pendingRemove?.muscles.length ?? 0} muscle group(s) and ${pendingRemove?.slots.length ?? 0} exercise(s). They will be removed.`}
        confirmLabel="Remove day"
        onConfirm={() => {
          if (pendingRemove) onRemoveDay(pendingRemove.id);
          setPendingRemove(null);
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </section>
  );
}
