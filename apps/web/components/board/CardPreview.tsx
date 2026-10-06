import type { BuilderSlot } from '../../lib/builder/types';
import { equipmentLabel } from '../../lib/labels';

// What follows the pointer while dragging (rendered in the DragOverlay).
export function CardPreview({ slot }: { slot: BuilderSlot }) {
  const { exercise } = slot;
  return (
    <div className="w-64 rounded-xl border border-aqua-400 bg-graphite-800 p-3 shadow-2xl shadow-aqua-950" data-testid="drag-preview">
      <p className="text-sm font-semibold">{exercise.name}</p>
      <p className="mt-1 text-xs text-graphite-300">
        {equipmentLabel(exercise.equipment_type)} · {slot.sets} sets · {slot.repMin}–{slot.repMax} reps · RIR {slot.rir}
        {slot.weight !== null ? ` · ${slot.weight}` : ''}
      </p>
    </div>
  );
}
