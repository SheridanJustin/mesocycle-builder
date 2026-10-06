import type { BuilderSlot } from '../../lib/builder/types';
import { equipmentLabel } from '../../lib/labels';

// What follows the pointer while dragging (rendered in the DragOverlay).
export function CardPreview({ slot }: { slot: BuilderSlot }) {
  const { exercise } = slot;
  return (
    <div className="w-72 rounded-lg border-2 border-blue-600 bg-white p-3 shadow-xl" data-testid="drag-preview">
      <p className="text-sm font-semibold">{exercise.name}</p>
      <p className="mt-1 text-xs text-slate-700">
        {equipmentLabel(exercise.equipment_type)} · {slot.sets} sets · {slot.repMin}–{slot.repMax} reps · RIR {slot.rir}
        {slot.weight !== null ? ` · ${slot.weight}` : ''}
      </p>
    </div>
  );
}
