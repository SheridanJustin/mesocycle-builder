'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MesocycleSummary } from '@mesocycle/shared';
import Link from 'next/link';
import { StatusBadge } from '../ui/StatusBadge';

type Props = {
  items: MesocycleSummary[];
  // Shown when the list is empty.
  empty: { title: string; text: string };
  onDelete: (item: MesocycleSummary) => void;
  // The full list of ids in the new order.
  onReorder: (ids: string[]) => void;
};

const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });

// Drafts open in the builder; locked mesocycles open their read-only plan.
export const mesocycleHref = (item: Pick<MesocycleSummary, 'id' | 'status'>) =>
  item.status === 'draft' ? `/mesocycles/${item.id}/build` : `/mesocycles/${item.id}`;

function GripIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 8 14" className="h-3.5 w-2 fill-current">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="6" cy="2" r="1.2" />
      <circle cx="2" cy="7" r="1.2" />
      <circle cx="6" cy="7" r="1.2" />
      <circle cx="2" cy="12" r="1.2" />
      <circle cx="6" cy="12" r="1.2" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.5h6.6L12 4M6.75 6.5v4.5M9.25 6.5v4.5" />
    </svg>
  );
}

function MesocycleCard({ item, onDelete }: { item: MesocycleSummary; onDelete: (item: MesocycleSummary) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li
      ref={setNodeRef}
      data-testid="mesocycle-card"
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`group relative flex flex-col justify-between gap-4 rounded-2xl border border-graphite-800 bg-graphite-900/80 p-4 transition-colors hover:border-aqua-700 hover:bg-graphite-900 ${
        isDragging ? 'z-20 opacity-80 shadow-2xl shadow-black/60 ring-2 ring-aqua-500' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Move ${item.name}`}
          title="Drag to reorder"
          className="relative z-10 -my-1 -ml-2 grid h-8 w-7 shrink-0 cursor-grab touch-none select-none place-items-center rounded-md text-graphite-400 hover:bg-graphite-800 hover:text-graphite-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-aqua-400 active:cursor-grabbing"
        >
          <GripIcon />
        </span>
        <Link href={mesocycleHref(item)} className="min-w-0 flex-1 text-base font-semibold text-graphite-50 after:absolute after:inset-0 hover:text-aqua-300">
          {item.name}
        </Link>
        <StatusBadge status={item.status} />
      </div>
      <dl className="flex gap-4 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-graphite-400">Length</dt>
          <dd className="font-medium">{item.duration_weeks} weeks</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wide text-graphite-400">Cycle</dt>
          <dd className="font-medium">{item.day_count}-day {item.schedule_mode === 'calendar' ? 'week (Mon–Sun)' : 'cycle'}</dd>
        </div>
        {item.start_date && (
          <div>
            <dt className="text-[11px] uppercase tracking-wide text-graphite-400">Starts</dt>
            <dd className="font-medium">{dateFormat.format(new Date(`${item.start_date}T00:00:00`))}</dd>
          </div>
        )}
      </dl>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-graphite-400">
          {item.ended_at ? `${item.status === 'dropped' ? 'Dropped' : 'Completed'} ${dateFormat.format(new Date(item.ended_at))}` : `Edited ${dateFormat.format(new Date(item.updated_at))}`}
        </span>
        {/* A mesocycle in progress (active or paused) must be dropped on its page before it can be deleted. */}
        {item.status !== 'active' && item.status !== 'paused' && (
          <button
            type="button"
            aria-label={`Delete ${item.name}`}
            onClick={() => onDelete(item)}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-lg border border-snow-600 bg-snow-900/70 px-2.5 py-1 text-xs font-semibold text-snow-100 transition-colors hover:border-snow-400 hover:bg-snow-700 hover:text-white"
          >
            <TrashIcon />
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

// The user's mesocycles as cards. Drag a card by its grip (or focus the grip, press Space and use
// the arrow keys) to reorder; the container saves the order.
export function MesocycleList({ items, empty, onDelete, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-graphite-700 bg-graphite-900/50 p-10 text-center">
        <p className="text-lg font-medium">{empty.title}</p>
        <p className="mt-1 text-sm text-graphite-400">{empty.text}</p>
      </div>
    );
  }

  const nameOf = (id: string | number) => items.find((item) => item.id === id)?.name ?? 'Mesocycle';
  const positionOf = (id: string | number) => items.findIndex((item) => item.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over position ${positionOf(over.id)} of ${items.length}.` : undefined),
    onDragEnd: ({ active, over }) =>
      over && over.id !== active.id
        ? `${nameOf(active.id)} moved to position ${positionOf(over.id)} of ${items.length}.`
        : `${nameOf(active.id)} was dropped. Nothing changed.`,
    onDragCancel: ({ active }) => `Move cancelled. ${nameOf(active.id)} stays where it was.`,
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || over.id === active.id) return;
    const ids = items.map((item) => item.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    onReorder(ids);
  }

  return (
    <DndContext id="mesocycle-list-dnd" sensors={sensors} collisionDetection={closestCenter} accessibility={{ announcements }} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((item) => item.id)} strategy={rectSortingStrategy}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Mesocycles">
          {items.map((item) => (
            <MesocycleCard key={item.id} item={item} onDelete={onDelete} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
