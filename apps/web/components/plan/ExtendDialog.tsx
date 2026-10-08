'use client';

import { MAX_DURATION_WEEKS, type MesocycleDetail } from '@mesocycle/shared';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';

type Props = {
  open: boolean;
  detail: MesocycleDetail;
  busy: boolean;
  onExtend: (weeks: number) => void;
  onClose: () => void;
};

// Adds weeks to a locked mesocycle (SPEC decision 21).
export function ExtendDialog({ open, detail, busy, onExtend, onClose }: Props) {
  const room = MAX_DURATION_WEEKS - detail.duration_weeks;
  const [weeks, setWeeks] = useState(1);
  const chosen = Math.min(weeks, Math.max(1, room));
  const deload = detail.weeks.find((w) => w.is_deload);
  const deloadMoves = deload !== undefined && deload.week_number === detail.duration_weeks && deload.sessions.every((s) => s.status === 'planned');

  return (
    <Dialog open={open} title="Extend mesocycle" onClose={onClose}>
      <div className="grid gap-3 text-sm">
        <p className="text-graphite-200">
          New weeks copy your last training week (with any set changes) and keep the RIR ramp going: one less each week, down to 0.
          {deloadMoves ? ' The deload week moves to the end.' : ''}
          {detail.status === 'completed' ? ' This completed mesocycle becomes active again.' : ''}
        </p>
        <fieldset>
          <legend className="mb-1.5 font-medium text-graphite-100">Add how many weeks?</legend>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: room }, (_, i) => i + 1).map((n) => (
              <label
                key={n}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-aqua-400 ${
                  chosen === n ? 'border-aqua-500 bg-aqua-500 text-graphite-950' : 'border-graphite-700 text-graphite-200 hover:border-graphite-500'
                }`}
              >
                <input type="radio" name="extend-weeks" value={n} checked={chosen === n} onChange={() => setWeeks(n)} className="sr-only" />+{n}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-graphite-400" data-testid="extend-summary">
          {detail.duration_weeks} → {detail.duration_weeks + chosen} weeks (at most {MAX_DURATION_WEEKS}).
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => onExtend(chosen)}>
            {busy ? 'Extending…' : `Add ${chosen} ${chosen === 1 ? 'week' : 'weeks'}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
