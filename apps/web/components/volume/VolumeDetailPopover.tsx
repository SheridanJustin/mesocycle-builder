import type { Muscle, MuscleVolume } from '@mesocycle/shared';
import { useEffect, useRef } from 'react';
import type { Contribution } from '../../lib/builder/volume';
import { formatSets } from '../../lib/builder/range-geometry';
import { muscleLabel, STATUS_DESCRIPTION, STATUS_LABEL } from '../../lib/labels';

type Props = {
  id: string;
  muscle: Muscle;
  entry: MuscleVolume;
  contributions: Contribution[];
  onClose: () => void;
};

export function VolumeDetailPopover({ id, muscle, entry, contributions, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { landmarks: l } = entry;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="false"
      aria-label={`${muscleLabel(muscle)} volume details`}
      data-testid="volume-popover"
      className="absolute left-0 right-0 top-full z-40 mx-auto max-w-2xl rounded-b-lg border border-graphite-700 bg-graphite-900 p-4 text-sm text-graphite-50 shadow-2xl"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{muscleLabel(muscle)}</h2>
          <p className="text-graphite-200">
            <strong>{STATUS_LABEL[entry.status]}</strong> — {STATUS_DESCRIPTION[entry.status]}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close volume details"
          className="rounded-md border border-graphite-700 bg-graphite-800 px-2 py-1 text-sm font-medium hover:bg-graphite-700"
        >
          Close
        </button>
      </div>


      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
        <div>
          <dt className="text-xs text-graphite-400">Weekly sets</dt>
          <dd className="font-semibold">{formatSets(entry.exact_total_sets)}</dd>
        </div>
        <div>
          <dt className="text-xs text-graphite-400">Frequency</dt>
          <dd className="font-semibold">{entry.weekly_frequency}× per week</dd>
        </div>
      </dl>

      <table className="mt-3 w-full text-left text-xs">
        <caption className="sr-only">Volume landmarks for {muscleLabel(muscle)}</caption>
        <thead>
          <tr className="text-graphite-400">
            <th scope="col">MV</th>
            <th scope="col">MEV</th>
            <th scope="col">MAV</th>
            <th scope="col">MRV</th>
          </tr>
        </thead>
        <tbody>
          <tr className="font-semibold">
            <td>{l.mv}</td>
            <td>{l.mev}</td>
            <td>
              {l.mav_low}–{l.mav_high}
            </td>
            <td>{l.mrv}</td>
          </tr>
        </tbody>
      </table>

      <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-graphite-400">Contributing exercises</h3>
      {contributions.length === 0 ? (
        <p className="text-graphite-400">No exercises yet.</p>
      ) : (
        <ul className="mt-1 grid gap-0.5">
          {contributions.map((c, index) => (
            <li key={`${c.dayName}-${c.exerciseName}-${index}`}>
              {c.exerciseName} <span className="text-graphite-400">· {c.dayName} · {c.sets} sets ({c.role})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
