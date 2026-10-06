'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MAX_DAYS_PER_WEEK, type Muscle, type ScheduleMode } from '@mesocycle/shared';
import { useState } from 'react';
import { dayIdFromDropId, describeMove, isDayDropId, resolveDrop } from '../../lib/builder/drop';
import { keyboardTarget, type ArrowKey } from '../../lib/builder/keyboard-targets';
import { findSlot } from '../../lib/builder/reducer';
import type { BuilderDay, BuilderSlot, BuilderState } from '../../lib/builder/types';
import { Button } from '../ui/Button';
import { CardPreview } from './CardPreview';
import { DroppableDayColumn } from './DroppableDayColumn';
import { SortableExerciseCard } from './SortableExerciseCard';
import type { BoardHandlers } from './types';

type Props = {
  state: BuilderState;
  mode: ScheduleMode;
  weightUnit: string;
  handlers: BoardHandlers;
  focusDayId: string | null;
  onFocusHandled: () => void;
};

// Cards win over the column behind them, so dropping on a card positions precisely. Keyboard drags
// have no pointer: keyboardTarget() parks the overlay's top-left corner on the chosen target, so
// the target is whichever droppable contains that corner (a card before its column).
const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

const collisionDetection: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) {
    const { left, top } = args.collisionRect;
    const containing = args.droppableContainers.filter((container) => {
      const rect = args.droppableRects.get(container.id);
      return rect !== undefined && left + 1 >= rect.left && left + 1 <= rect.right && top + 1 >= rect.top && top + 1 <= rect.bottom;
    });
    const card = containing.find((container) => !isDayDropId(String(container.id)));
    const target = card ?? containing[0];
    return target ? [{ id: target.id }] : [];
  }
  const pointer = pointerWithin(args);
  const hits = pointer.length > 0 ? pointer : rectIntersection(args);
  const card = hits.find((hit) => !isDayDropId(String(hit.id)));
  return card ? [card] : hits.slice(0, 1);
};

// The horizontal board: day columns side by side in an overflow-x container with scroll-snap.
// Only this container scrolls sideways; the page body never does. dnd-kit auto-scrolls it when a
// dragged card nears the left or right edge.
export function Board({ state, mode, weightUnit, handlers, focusDayId, onFocusHandled }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overDayId, setOverDayId] = useState<string | null>(null);
  const takenWeekdays = new Set(state.days.flatMap((d) => (d.weekday === null ? [] : [d.weekday])));

  // Arrow keys move the dragged card through the targets chosen by keyboardTarget(): up/down within
  // its section, left/right to the neighbouring day.
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, { context: { active, over, droppableRects } }) => {
    if (!ARROWS.includes(event.code)) return undefined;
    event.preventDefault();
    if (!active) return undefined;
    const target = keyboardTarget(state, String(active.id), over ? String(over.id) : null, event.code as ArrowKey);
    const rect = target ? droppableRects.get(target) : undefined;
    return rect ? { x: rect.left, y: rect.top } : undefined;
  };

  const sensors = useSensors(
    // A small distance keeps clicks on the handle from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  const activeSlot = activeId ? findSlot(state, activeId)?.slot : undefined;
  const nameOf = (id: string | number) => findSlot(state, String(id))?.slot.exercise.name ?? 'card';

  function dayOf(id: string | number | undefined): string | null {
    if (id === undefined) return null;
    const text = String(id);
    return isDayDropId(text) ? dayIdFromDropId(text) : (findSlot(state, text)?.day.id ?? null);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${nameOf(active.id)} is not over a drop target.`;
      const day = state.days.find((d) => d.id === dayOf(over.id));
      if (!day) return undefined;
      if (isDayDropId(String(over.id))) return `${nameOf(active.id)} is over ${day.name}.`;
      return over.id === active.id
        ? `${nameOf(active.id)} is in its original position in ${day.name}.`
        : `${nameOf(active.id)} is over ${nameOf(over.id)} in ${day.name}.`;
    },
    onDragEnd: ({ active, over }) => {
      const action = over ? resolveDrop(state, String(active.id), String(over.id)) : null;
      return action ? describeMove(state, action) : `${nameOf(active.id)} was dropped. Nothing changed.`;
    },
    onDragCancel: ({ active }) => `Move cancelled. ${nameOf(active.id)} stays where it was.`,
  };

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    const target = dayOf(over?.id);
    setOverDayId(target && target !== findSlot(state, String(active.id))?.day.id ? target : null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setOverDayId(null);
    if (!over) return;
    const action = resolveDrop(state, String(active.id), String(over.id));
    if (action) handlers.onMoveSlot(action.slotId, action.toDayId, action.toMuscle, action.beforeSlotId);
  }

  function renderCards(day: BuilderDay, _muscle: Muscle, slots: BuilderSlot[]) {
    return (
      <SortableContext items={slots.map((slot) => slot.id)} strategy={verticalListSortingStrategy}>
        {slots.map((slot, index) => (
          <SortableExerciseCard
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
        ))}
      </SortableContext>
    );
  }

  return (
    <DndContext
      id="board-dnd"
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ announcements }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setOverDayId(null);
      }}
    >
      <div
        role="region"
        aria-label="Training days board"
        tabIndex={0}
        data-testid="board"
        // Scroll snapping is switched off while dragging: it would snap every small auto-scroll step back.
        className={`flex items-start gap-4 overflow-x-auto px-4 pb-6 pt-4 ${activeId ? 'snap-none' : 'snap-x snap-proximity'}`}
      >
        {state.days.map((day) => (
          <DroppableDayColumn
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
            highlighted={overDayId === day.id}
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
      <DragOverlay>{activeSlot ? <CardPreview slot={activeSlot} /> : null}</DragOverlay>
    </DndContext>
  );
}
