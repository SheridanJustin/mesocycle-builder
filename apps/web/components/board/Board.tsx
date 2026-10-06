'use client';

import { MAX_DAYS_PER_WEEK, type Muscle, type ScheduleMode } from '@mesocycle/shared';
import type { BuilderDay, BuilderSlot, BuilderState } from '../../lib/builder/types';
import { Button } from '../ui/Button';
import { DayColumn } from './DayColumn';
import { ExerciseCard } from './ExerciseCard';
import type { BoardHandlers } from './types';

type Props = {
  state: BuilderState;
  mode: ScheduleMode;
  weightUnit: string;
  handlers: BoardHandlers;
  focusDayId: string | null;
  onFocusHandled: () => void;
};

// The horizontal board: day columns side by side in an overflow-x container with scroll-snap.
// Only this container scrolls sideways; the page body never does.
export function Board({ state, mode, weightUnit, handlers, focusDayId, onFocusHandled }: Props) {
  const takenWeekdays = new Set(state.days.flatMap((d) => (d.weekday === null ? [] : [d.weekday])));

  function renderCards(day: BuilderDay, _muscle: Muscle, slots: BuilderSlot[]) {
    return slots.map((slot, index) => (
      <ExerciseCard
        key={slot.id}
        slot={slot}
        isFirst={index === 0}
        isLast={index === slots.length - 1}
        otherDays={state.days.filter((d) => d.id !== day.id).map((d) => ({ id: d.id, name: d.name }))}
        weightUnit={weightUnit}
        onUpdate={(patch) => handlers.onUpdateSlot(slot.id, patch)}
        onStep={(direction) => handlers.onStepSlot(slot.id, direction)}
        onMoveToDay={(dayId) => handlers.onMoveSlotToDay(slot.id, dayId)}
        onRemove={() => handlers.onRemoveSlot(slot.id)}
      />
    ));
  }

  return (
    <div
      role="region"
      aria-label="Training days board"
      tabIndex={0}
      data-testid="board"
      className="flex snap-x snap-proximity items-start gap-4 overflow-x-auto px-4 pb-6 pt-4"
    >
      {state.days.map((day) => (
        <DayColumn
          key={day.id}
          day={day}
          dayCount={state.days.length}
          mode={mode}
          takenWeekdays={takenWeekdays}
          priorities={state.priorities}
          handlers={handlers}
          renderCards={renderCards}
          focusName={focusDayId === day.id}
          onFocusNameHandled={onFocusHandled}
        />
      ))}
      {state.days.length < MAX_DAYS_PER_WEEK && (
        <div className="w-[85vw] max-w-sm shrink-0 snap-start sm:w-80">
          <Button className="w-full border-dashed py-6" onClick={handlers.onAddDay}>
            + Add day
          </Button>
        </div>
      )}
    </div>
  );
}
