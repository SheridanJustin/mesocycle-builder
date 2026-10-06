'use client';

import { MAX_DURATION_WEEKS, MIN_DURATION_WEEKS } from '@mesocycle/shared';
import { InlineText } from '../ui/InlineText';

export type MesocycleSettings = { name: string; durationWeeks: number; deloadFinalWeek: boolean };

type Props = {
  settings: MesocycleSettings;
  trainingDays: number;
  restDays: number;
  onSettingsChange: (patch: Partial<MesocycleSettings>) => void;
};

// The last step: block settings now, the review dashboard and lock-in later (M8).
export function ReviewTab({ settings, trainingDays, restDays, onSettingsChange }: Props) {
  return (
    <section aria-labelledby="review-title" className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
      <h2 id="review-title" className="text-xl font-semibold">
        Review
      </h2>

      <div className="grid gap-4 rounded-lg border border-graphite-800 bg-graphite-900 p-4 sm:grid-cols-2">
        <label className="block text-sm font-medium sm:col-span-2">
          Mesocycle name
          <InlineText
            ariaLabel="Mesocycle name"
            value={settings.name}
            maxLength={255}
            onCommit={(name) => onSettingsChange({ name })}
            className="mt-1 w-full border-graphite-700 bg-graphite-950"
          />
        </label>
        <label className="block text-sm font-medium">
          Duration
          <select
            className="mt-1 block w-full rounded-md border border-graphite-700 bg-graphite-950 px-2 py-1.5 text-sm text-graphite-50"
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
          <input
            type="checkbox"
            className="h-4 w-4 accent-aqua-500"
            checked={settings.deloadFinalWeek}
            onChange={(e) => onSettingsChange({ deloadFinalWeek: e.target.checked })}
          />
          Deload in the final week
        </label>
      </div>

      <p className="text-sm text-graphite-300" data-testid="cycle-summary">
        {trainingDays} training day{trainingDays === 1 ? '' : 's'} and {restDays} rest day{restDays === 1 ? '' : 's'} per cycle.
      </p>

      <p className="rounded-lg border border-dashed border-graphite-700 bg-graphite-900 p-6 text-graphite-300">
        The review dashboard and lock-in arrive in the next milestone. Your draft is saved automatically.
      </p>
    </section>
  );
}
