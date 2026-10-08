import type { Records } from '@mesocycle/shared';
import Link from 'next/link';
import { formatIsoDate } from '../../lib/dates';
import { muscleLabel } from '../../lib/labels';
import { formatSet, formatWeight } from '../../lib/workout-entry';

type Best = Records['exercises'][number]['best_e1rm'];

function BestCell({ best, e1rm = false }: { best: Best; e1rm?: boolean }) {
  if (!best) return <span className="text-graphite-400">—</span>;
  return (
    <span className="grid">
      <span className="font-semibold tabular-nums text-graphite-50">{e1rm ? formatWeight(best.e1rm) : formatSet(best)}</span>
      <span className="text-xs text-graphite-400">
        {e1rm ? `${formatSet(best)} · ` : ''}
        {formatIsoDate(best.date, 'short')}
      </span>
    </span>
  );
}

// Personal bests per exercise (SPEC decision 19), most recently trained first.
export function RecordsView({ records }: { records: Records }) {
  const unit = records.weight_unit;
  return (
    <main className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-5">
        <h1 className="text-2xl font-semibold tracking-tight">Personal bests</h1>
        <p className="mt-1 text-sm text-graphite-400">
          From every set you logged. Estimated 1RM uses the Epley formula (weight × (1 + reps ÷ 30)); weights are in {unit}.
        </p>
        {records.exercises.length === 0 ? (
          <p data-testid="records-empty" className="mt-6 rounded-xl border border-dashed border-graphite-700 p-6 text-center text-sm text-graphite-300">
            No sets logged yet. Start a workout from an active{' '}
            <Link href="/mesocycles" className="text-aqua-300 underline">
              mesocycle
            </Link>{' '}
            and your bests show up here.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-graphite-800 bg-graphite-900/80">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-graphite-800 text-[11px] uppercase tracking-wider text-graphite-400">
                <tr>
                  <th scope="col" className="px-4 py-2 font-semibold">Exercise</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Est. 1RM ({unit})</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Heaviest</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Most reps (BW)</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold">Sets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800">
                {records.exercises.map((row) => (
                  <tr key={row.exercise.id} data-testid="record-row">
                    <th scope="row" className="px-4 py-2.5 font-normal">
                      <span className="block font-medium text-graphite-50">{row.exercise.name}</span>
                      <span className="text-xs text-graphite-400">
                        {muscleLabel(row.exercise.primary_muscle)} · last {formatIsoDate(row.last_logged, 'short')}
                      </span>
                    </th>
                    <td className="px-3 py-2.5" data-testid="record-e1rm">
                      <BestCell best={row.best_e1rm} e1rm />
                    </td>
                    <td className="px-3 py-2.5" data-testid="record-heaviest">
                      <BestCell best={row.heaviest} />
                    </td>
                    <td className="px-3 py-2.5">
                      <BestCell best={row.most_reps} />
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-graphite-300">{row.sets_logged}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
