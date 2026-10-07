'use client';

import type { LockMesocycle, ScheduleMode } from '@mesocycle/shared';
import type { LockWarning } from '@mesocycle/volume-engine';
import { useEffect, useState } from 'react';
import { formatIsoDate } from '../../lib/dates';
import { groupLabel, STATUS_LABEL } from '../../lib/labels';
import { Button } from '../ui/Button';
import { usePreferences } from '../preferences/PreferencesContext';
import { Dialog } from '../ui/Dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  mode: ScheduleMode;
  weeks: number;
  deloadFinalWeek: boolean;
  trainingDays: number;
  warnings: LockWarning[];
  // Start-date choices (Mondays) for a Mon-Sun mesocycle; the first is preselected.
  mondays: string[];
  busy: boolean;
  error: string | null;
  onConfirm: (body: LockMesocycle) => void;
};

// Confirms lock-in (SPEC 10.6): what will be created, the start Monday for Mon-Sun weeks, and an
// "I understand" checkbox when muscle groups are below MV or above MRV.
export function LockInDialog({ open, onClose, mode, weeks, deloadFinalWeek, trainingDays, warnings, mondays, busy, error, onConfirm }: Props) {
  const [startDate, setStartDate] = useState(mondays[0] ?? '');
  const [acknowledged, setAcknowledged] = useState(false);

  // Fresh choices every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setStartDate(mondays[0] ?? '');
    setAcknowledged(false);
  }, [open, mondays]);

  const calendar = mode === 'calendar';
  const { showRir } = usePreferences();
  const workouts = weeks * trainingDays;
  const blocked = trainingDays === 0 || (warnings.length > 0 && !acknowledged) || (calendar && !startDate);

  return (
    <Dialog open={open} title="Lock in mesocycle" onClose={onClose}>
      <div className="grid gap-4 text-sm text-graphite-200">
        <p>
          Locking in <strong>freezes this plan</strong> and creates your workouts for every week. You can&apos;t edit the days or exercises
          afterwards.
        </p>

        <ul className="grid gap-1.5 rounded-xl border border-graphite-800 bg-graphite-950/60 p-3" data-testid="lock-summary">
          <li>
            <strong className="text-graphite-50">
              {weeks} weeks × {trainingDays} workout{trainingDays === 1 ? '' : 's'} = {workouts} workouts
            </strong>
          </li>
          <li>
            {showRir ? "Each exercise's RIR drops by 1 every week (never below 0); sets and reps stay as planned." : 'Sets and reps stay as planned every week.'}
          </li>
          {deloadFinalWeek && <li>Week {weeks} is a deload: half the sets{showRir ? ', back to the Week 1 RIR' : ''}.</li>}
        </ul>

        {calendar && (
          <label className="grid gap-1 font-medium text-graphite-300">
            First week starts on
            <select
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-graphite-700 bg-graphite-950 px-2.5 py-2 text-sm text-graphite-50"
            >
              {mondays.map((monday, index) => (
                <option key={monday} value={monday}>
                  {formatIsoDate(monday)}
                  {index === 0 ? ' (this week)' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {warnings.length > 0 && (
          <div role="group" aria-label="Volume warnings" className="rounded-xl border border-status-orange-border bg-status-orange-bg p-3 text-status-orange-text">
            <p className="font-semibold text-graphite-50">Some muscle groups are outside their recommended range:</p>
            <ul className="mt-1 list-disc pl-5" data-testid="lock-warnings">
              {warnings.map((w) => (
                <li key={w.group}>
                  {groupLabel(w.group)}: {STATUS_LABEL[w.status]} ({w.totalSets} set{w.totalSets === 1 ? '' : 's'} per week)
                </li>
              ))}
            </ul>
            <label className="mt-2 flex items-center gap-2 font-medium text-graphite-50">
              <input type="checkbox" className="h-4 w-4 accent-aqua-500" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />I
              understand and want to lock in anyway
            </label>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-3 text-snow-100">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={blocked || busy}
            onClick={() =>
              onConfirm({ ...(calendar ? { start_date: startDate } : {}), acknowledge_warnings: warnings.length > 0 && acknowledged })
            }
          >
            {busy ? 'Locking in…' : 'Lock in'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
