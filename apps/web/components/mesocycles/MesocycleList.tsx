import type { MesocycleSummary } from '@mesocycle/shared';
import Link from 'next/link';
import { Button } from '../ui/Button';

const BADGE: Record<MesocycleSummary['status'], string> = {
  draft: 'bg-slate-200 text-slate-900',
  active: 'bg-green-100 text-green-900',
  completed: 'bg-blue-100 text-blue-900',
};

type Props = { items: MesocycleSummary[]; onDelete: (item: MesocycleSummary) => void };

export function MesocycleList({ items, onDelete }: Props) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-slate-600">No mesocycles yet. Create your first one.</p>;
  }
  return (
    <ul className="grid gap-3" aria-label="Mesocycles">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
          <div>
            <Link href={`/mesocycles/${item.id}/build`} className="text-lg font-medium text-blue-800 hover:underline">
              {item.name}
            </Link>
            <p className="mt-1 text-sm text-slate-600">
              {item.duration_weeks} weeks · {item.day_count} days · {item.schedule_mode === 'calendar' ? 'calendar' : 'relative'} schedule
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
