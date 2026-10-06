'use client';

import { MESOCYCLE_TEMPLATES, WEEK_DAYS, type MesocycleTemplate } from '@mesocycle/shared';
import { WEEKDAY_NAMES } from '../../lib/days';
import { Dialog } from '../ui/Dialog';

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (template: MesocycleTemplate) => void;
  // Shown above the list, e.g. that picking replaces the current days.
  note?: string;
  // The template being applied; every choice is disabled meanwhile.
  busyId?: string | null;
  error?: string | null;
};

function dayLabel(template: MesocycleTemplate, index: number): string {
  return template.mode === 'calendar' && template.days.length === WEEK_DAYS ? (WEEKDAY_NAMES[index] ?? '') : `D${index + 1}`;
}

// Prebuilt starting points: each card shows which days train and how much work the week holds.
export function TemplatePicker({ open, onClose, onPick, note, busyId = null, error = null }: Props) {
  return (
    <Dialog open={open} title="Start from a template" onClose={onClose} wide>
      {note && <p className="mb-3 text-sm text-graphite-300">{note}</p>}
      {error && (
        <p role="alert" className="mb-3 rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
          {error}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Templates">
        {MESOCYCLE_TEMPLATES.map((template) => {
          const training = template.days.filter((day) => day.length > 0);
          const exercises = training.reduce((sum, day) => sum + day.length, 0);
          const sets = training.reduce((sum, day) => sum + day.reduce((s, slot) => s + slot.sets, 0), 0);
          return (
            <li key={template.id}>
              <button
                type="button"
                data-testid={`template-${template.id}`}
                disabled={busyId !== null}
                onClick={() => onPick(template)}
                className="flex h-full w-full flex-col gap-2 rounded-xl border border-graphite-700 bg-graphite-950/60 p-3 text-left transition-colors hover:border-aqua-500 hover:bg-aqua-950/30 disabled:cursor-wait disabled:opacity-60"
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-graphite-50">{template.name}</span>
                  <span className="shrink-0 text-xs font-medium text-aqua-300">
                    {busyId === template.id ? 'Applying…' : `${training.length} days / week`}
                  </span>
                </span>
                <span className="text-xs leading-relaxed text-graphite-400">{template.summary}</span>
                <span className="flex gap-1" aria-hidden="true">
                  {template.days.map((day, index) => (
                    <span
                      key={index}
                      className={`flex-1 rounded-md py-1 text-center text-[10px] font-semibold ${
                        day.length > 0 ? 'bg-aqua-500/20 text-aqua-200 ring-1 ring-aqua-700' : 'bg-graphite-800/60 text-graphite-500'
                      }`}
                    >
                      {dayLabel(template, index)}
                    </span>
                  ))}
                </span>
                <span className="text-[11px] text-graphite-500">
                  {exercises} exercises · {sets} sets per week
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-graphite-500">Everything stays editable after you pick: move, add or remove exercises and days.</p>
    </Dialog>
  );
}
