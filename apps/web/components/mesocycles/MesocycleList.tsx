import type { MesocycleSummary } from '@mesocycle/shared';
import Link from 'next/link';

const BADGE: Record<MesocycleSummary['status'], string> = {
  draft: 'bg-graphite-800 text-graphite-200 ring-graphite-700',
  active: 'bg-shamrock-950 text-shamrock-300 ring-shamrock-800',
  completed: 'bg-aqua-950 text-aqua-300 ring-aqua-800',
};

type Props = { items: MesocycleSummary[]; onDelete: (item: MesocycleSummary) => void };

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

export function MesocycleList({ items, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-graphite-700 bg-graphite-900/50 p-10 text-center">
        <p className="text-lg font-medium">No mesocycles yet</p>
        <p className="mt-1 text-sm text-graphite-400">Create your first mesocycle, or start from a template.</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mesocycles">
      {items.map((item) => (
        <li
          key={item.id}
          className="group relative flex flex-col justify-between gap-4 rounded-2xl border border-graphite-800 bg-graphite-900/80 p-4 transition hover:border-aqua-700 hover:bg-graphite-900"
        >
          <div className="flex items-start justify-between gap-2">
            <Link href={`/mesocycles/${item.id}/build`} className="text-base font-semibold text-graphite-50 after:absolute after:inset-0 hover:text-aqua-300">
              {item.name}
            </Link>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${BADGE[item.status]}`}>
              {item.status}
            </span>
          </div>
          <div className="flex items-end justify-between gap-2 text-sm">
            <dl className="flex gap-4">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-graphite-500">Length</dt>
                <dd className="font-medium">{item.duration_weeks} weeks</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-graphite-500">Cycle</dt>
                <dd className="font-medium">{item.day_count}-day {item.schedule_mode === 'calendar' ? 'week (Mon–Sun)' : 'cycle'}</dd>
              </div>
            </dl>
            <span className="text-xs text-graphite-500">Edited {dateFormat.format(new Date(item.updated_at))}</span>
          </div>
          {item.status === 'draft' && (
            <button
              type="button"
              aria-label={`Delete ${item.name}`}
              onClick={() => onDelete(item)}
              className="relative z-10 self-start text-xs font-medium text-graphite-400 hover:text-snow-300"
            >
              Delete
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
