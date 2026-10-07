import type { MesocycleStatus } from '@mesocycle/shared';

const STYLE: Record<MesocycleStatus, string> = {
  draft: 'bg-graphite-800 text-graphite-200 ring-graphite-700',
  active: 'bg-shamrock-950 text-shamrock-300 ring-shamrock-800',
  completed: 'bg-aqua-950 text-aqua-300 ring-aqua-800',
  dropped: 'bg-snow-950 text-snow-300 ring-snow-800',
};

export function StatusBadge({ status }: { status: MesocycleStatus }) {
  return (
    <span data-testid="status-badge" className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${STYLE[status]}`}>
      {status}
    </span>
  );
}
