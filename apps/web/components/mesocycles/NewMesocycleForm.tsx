'use client';

import {
  MAX_DAYS_PER_WEEK,
  MAX_DURATION_WEEKS,
  MIN_DAYS_PER_WEEK,
  MIN_DURATION_WEEKS,
  type CreateMesocycle,
  type ScheduleMode,
} from '@mesocycle/shared';
import { useState, type FormEvent } from 'react';
import { WEEKDAY_NAMES } from '../../lib/days';
import { Button } from '../ui/Button';

type Props = {
  onSubmit: (values: CreateMesocycle) => void;
  submitting: boolean;
  error: string | null;
};

const input = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

export function NewMesocycleForm({ onSubmit, submitting, error }: Props) {
  const [name, setName] = useState('');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [mode, setMode] = useState<ScheduleMode>('relative');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  function toggleWeekday(day: number) {
    setWeekdays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day]));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) return setLocalError('Enter a name.');
    if (mode === 'calendar' && weekdays.length > 0 && weekdays.length !== daysPerWeek) {
      return setLocalError(`Select exactly ${daysPerWeek} weekdays, or none to choose them later.`);
    }
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      duration_weeks: durationWeeks,
      days_per_week: daysPerWeek,
      schedule_mode: mode,
      ...(mode === 'calendar' && weekdays.length > 0 ? { weekdays } : {}),
    });
  }

  const shownError = localError ?? error;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-6">
      <label className="block text-sm font-medium">
        Name
        <input className={input} value={name} maxLength={255} onChange={(e) => setName(e.target.value)} placeholder="Fall Hypertrophy Block" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Duration (weeks)
          <select className={input} value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))}>
            {Array.from({ length: MAX_DURATION_WEEKS - MIN_DURATION_WEEKS + 1 }, (_, i) => MIN_DURATION_WEEKS + i).map((n) => (
              <option key={n} value={n}>
                {n} weeks
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Training days per week
          <select className={input} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))}>
            {Array.from({ length: MAX_DAYS_PER_WEEK - MIN_DAYS_PER_WEEK + 1 }, (_, i) => MIN_DAYS_PER_WEEK + i).map((n) => (
              <option key={n} value={n}>
                {n} days
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Schedule</legend>
        <div className="mt-1 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" checked={mode === 'relative'} onChange={() => setMode('relative')} />
            Relative (Day 1, Day 2, …)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="mode" checked={mode === 'calendar'} onChange={() => setMode('calendar')} />
            Calendar (specific weekdays)
          </label>
        </div>
      </fieldset>

      {mode === 'calendar' && (
        <fieldset>
          <legend className="text-sm font-medium">Weekdays (optional now, required before locking)</legend>
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            {WEEKDAY_NAMES.map((label, day) => (
              <label key={label} className="flex items-center gap-1">
                <input type="checkbox" checked={weekdays.includes(day)} onChange={() => toggleWeekday(day)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {shownError && (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-900">
          {shownError}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create and start building'}
        </Button>
      </div>
    </form>
  );
}
