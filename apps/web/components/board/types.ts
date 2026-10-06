import type { Muscle } from '@mesocycle/shared';
import type { SlotMetrics } from '../../lib/builder/types';

// Everything the board can ask its container to do. The board itself fetches nothing.
export type BoardHandlers = {
  onRenameDay: (dayId: string, name: string) => void;
  onSetWeekday: (dayId: string, weekday: number | null) => void;
  onAddDay: () => void;
  onDuplicateDay: (dayId: string) => void;
  onRemoveDay: (dayId: string) => void;
  onAddMuscle: (dayId: string, muscle: Muscle) => void;
  onRemoveMuscle: (dayId: string, muscle: Muscle) => void;
  onAddExercise: (dayId: string, muscle: Muscle) => void;
  onUpdateSlot: (slotId: string, patch: Partial<SlotMetrics>) => void;
  onStepSlot: (slotId: string, direction: 'up' | 'down') => void;
  onMoveSlotToDay: (slotId: string, dayId: string) => void;
  onRemoveSlot: (slotId: string) => void;
};
