import type { Exercise } from '@mesocycle/shared';
import type { SlotMetrics } from '../../lib/builder/types';

// Everything the board can ask its container to do. The board itself fetches nothing.
export type BoardHandlers = {
  onSetNumbered: (numbered: boolean) => void;
  onAddDay: () => void;
  onRemoveDay: (dayId: string) => void;
  onClearDay: (dayId: string) => void;
  onRenameDay: (dayId: string, name: string) => void;
  // targetDayId null = duplicate into a new day right after the source (numbered days only).
  onCopyDay: (sourceDayId: string, targetDayId: string | null) => void;
  onOpenAddExercises: (dayId: string) => void;
  onUpdateSlot: (slotId: string, patch: Partial<SlotMetrics>) => void;
  // Drag and drop result: where the card goes and which card it lands before (null = end).
  onMoveSlot: (slotId: string, toDayId: string, beforeSlotId: string | null) => void;
  onRemoveSlot: (slotId: string) => void;
  // Day column drag and drop: the day's new 0-based position.
  onMoveDay: (dayId: string, toIndex: number) => void;
  onOpenTemplates: () => void;
};

export type AddExercises = (dayId: string, exercises: Exercise[]) => void;
