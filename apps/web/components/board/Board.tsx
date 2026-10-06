'use client';

import {
  DndContext,
  DragOverlay,
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
import { MAX_CYCLE_DAYS, MIN_CYCLE_DAYS, WEEK_DAYS } from '@mesocycle/shared';
import { useState } from 'react';
import { dayIdFromDropId, describeMove, isDayDropId, resolveDrop } from '../../lib/builder/drop';
import { keyboardTarget, type ArrowKey } from '../../lib/builder/keyboard-targets';
import { findSlot } from '../../lib/builder/reducer';
import { CardKeyboardSensor, CardPointerSensor } from '../../lib/builder/sensors';
import type { BuilderDay, BuilderState } from '../../lib/builder/types';
import { CardPreview } from './CardPreview';
import { DroppableDayColumn } from './DroppableDayColumn';
import { SortableExerciseCard } from './SortableExerciseCard';
import type { BoardHandlers } from './types';

type Props = {
  state: BuilderState;
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
export function Board({ state, weightUnit, handlers, focusDayId, onFocusHandled }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overDayId, setOverDayId] = useState<string | null>(null);
  const numbered = state.mode === 'relative';

  // Arrow keys move the dragged card through the targets chosen by keyboardTarget(): up/down within
  // the day, left/right to the neighbouring day.
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, { context: { active, over, droppableRects } }) => {
    if (!ARROWS.includes(event.code)) return undefined;
    event.preventDefault();
    if (!active) return undefined;
    const target = keyboardTarget(state, String(active.id), over ? String(over.id) : null, event.code as ArrowKey);
    const rect = target ? droppableRects.get(target) : undefined;
    return rect ? { x: rect.left, y: rect.top } : undefined;
  };

  const sensors = useSensors(
    // Press and hold a card for a moment to pick it up; a quick click or a scroll does not.
    useSensor(CardPointerSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(CardKeyboardSensor, { coordinateGetter: keyboardCoordinates }),
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
    if (action) handlers.onMoveSlot(action.slotId, action.toDayId, action.beforeSlotId);
  }

  function renderCards(day: BuilderDay) {
    return (
      <SortableContext items={day.slots.map((slot) => slot.id)} strategy={verticalListSortingStrategy}>
        {day.slots.map((slot) => (
          <SortableExerciseCard
            key={slot.id}
            slot={slot}
            weightUnit={weightUnit}
            onUpdate={(patch) => handlers.onUpdateSlot(slot.id, patch)}
            onRemove={() => handlers.onRemoveSlot(slot.id)}
          />
        ))}
      </SortableContext>
    );
  }

  return (
    <div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-3 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2 text-graphite-200">
          <input
            type="checkbox"
            role="switch"
            className="peer sr-only"
            checked={numbered}
            // Weekday names need exactly 7 days, so going back to them is only possible then.
            disabled={numbered && state.days.length !== WEEK_DAYS}
            onChange={(e) => handlers.onSetNumbered(e.target.checked)}
            aria-label="Number the days (Day 1, Day 2, …)"
          />
          <span
            aria-hidden="true"
            className="relative h-5 w-9 rounded-full bg-graphite-700 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-graphite-200 after:transition-transform peer-checked:bg-aqua-600 peer-checked:after:translate-x-4 peer-checked:after:bg-white peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-aqua-400 peer-disabled:opacity-50"
          />
          Number the days
        </label>
        <span className="text-xs text-graphite-500">
          {numbered && state.days.length !== WEEK_DAYS
            ? `Weekday names need exactly ${WEEK_DAYS} days.`
            : 'Empty days are rest days · press and hold a card to drag it'}
        </span>
      </div>

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
          className={`flex items-start gap-3 overflow-x-auto px-4 pb-6 pt-3 ${activeId ? 'snap-none' : 'snap-x snap-proximity'}`}
        >
          {state.days.map((day) => (
            <DroppableDayColumn
              key={day.id}
              day={day}
              copyTargets={state.days.filter((d) => d.id !== day.id).map((d) => ({ id: d.id, name: d.name }))}
              canDuplicate={numbered && state.days.length < MAX_CYCLE_DAYS}
              canRemove={numbered && state.days.length > MIN_CYCLE_DAYS}
              handlers={handlers}
              focusName={focusDayId === day.id}
              onFocusNameHandled={onFocusHandled}
              highlighted={overDayId === day.id}
            >
              {renderCards(day)}
            </DroppableDayColumn>
          ))}
          {state.days.length < MAX_CYCLE_DAYS && (
            <div className="w-40 shrink-0 snap-start">
              <button
                type="button"
                onClick={handlers.onAddDay}
                className="w-full rounded-2xl border border-dashed border-graphite-700 py-8 text-sm font-medium text-graphite-400 transition-colors hover:border-aqua-500 hover:text-aqua-300"
              >
                + Add day
              </button>
              {!numbered && <p className="mt-2 px-1 text-[11px] text-graphite-500">Adding an 8th day switches to numbered days.</p>}
            </div>
          )}
        </div>
        <DragOverlay>{activeSlot ? <CardPreview slot={activeSlot} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
