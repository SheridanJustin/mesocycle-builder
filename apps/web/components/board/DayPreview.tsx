import type { BuilderDay } from '../../lib/builder/types';

// What follows the pointer while a whole day is dragged (rendered in the DragOverlay).
export function DayPreview({ day }: { day: BuilderDay }) {
  const shown = day.slots.slice(0, 5);
  return (
    <div className="w-56 rounded-2xl border border-aqua-400 bg-graphite-800 p-3 shadow-2xl shadow-aqua-950" data-testid="day-drag-preview">
      <p className="text-sm font-semibold">{day.name}</p>
      {day.slots.length === 0 ? (
        <p className="mt-1 text-xs uppercase tracking-wider text-graphite-400">Rest day</p>
      ) : (
        <ul className="mt-1.5 grid gap-1 text-xs text-graphite-300">
          {shown.map((slot) => (
            <li key={slot.id} className="truncate">
              {slot.exercise.name}
            </li>
          ))}
          {day.slots.length > shown.length && <li className="text-graphite-400">+{day.slots.length - shown.length} more</li>}
        </ul>
      )}
    </div>
  );
}
