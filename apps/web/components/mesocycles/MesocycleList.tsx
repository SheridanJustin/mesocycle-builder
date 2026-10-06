import type { MesocycleSummary } from '@mesocycle/shared';
import Link from 'next/link';
import { Button } from '../ui/Button';

const BADGE: Record<MesocycleSummary['status'], string> = {
  draft: 'bg-graphite-700 text-graphite-100',
  active: 'bg-shamrock-900 text-shamrock-200',
  completed: 'bg-aqua-900 text-aqua-200',
};

type Props = { items: MesocycleSummary[]; onDelete: (item: MesocycleSummary) => void };

export function MesocycleList({ items, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-graphite-700 p-8 text-center text-graphite-300">
        No mesocycles yet. Create your first one.
      </p>
    );
  }
  return (
    <ul className="grid gap-3" aria-label="Mesocycles">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-graphite-800 bg-graphite-900 p-4">
          <div>
            <Link href={`/mesocycles/${item.id}/build`} className="text-lg font-medium text-aqua-300 hover:underline">
              {item.name}
            </Link>
            <p className="mt-1 text-sm text-graphite-300">
              {item.duration_weeks} weeks · {item.day_count}-day {item.schedule_mode === 'calendar' ? 'week (Mon–Sun)' : 'cycle'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${BADGE[item.status]}`}>{item.status}</span>
            {item.status === 'draft' && (
              <Button size="sm" variant="ghost" aria-label={`Delete ${item.name}`} onClick={() => onDelete(item)}>
                Delete
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
