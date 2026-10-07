'use client';

import {
  closestCenter,
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
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MAX_CYCLE_DAYS, MIN_CYCLE_DAYS, WEEK_DAYS } from '@mesocycle/shared';
import { useRef, useState } from 'react';
import {
  columnId,
  dayIdFromColumnId,
  dayIdFromDropId,
  describeDayMove,
  describeMove,
  isColumnId,
  isDayDropId,
  resolveDayDrop,
  resolveDrop,
} from '../../lib/builder/drop';
import { columnKeyboardTarget, keyboardTarget, type ArrowKey } from '../../lib/builder/keyboard-targets';
import { findSlot } from '../../lib/builder/reducer';
import { CardKeyboardSensor, CardPointerSensor } from '../../lib/builder/sensors';
import type { BuilderDay, BuilderState } from '../../lib/builder/types';
import { CardPreview } from './CardPreview';
import { DayPreview } from './DayPreview';
import { DragTip } from './DragTip';
import { SortableDayColumn } from './SortableDayColumn';
import { SortableExerciseCard } from './SortableExerciseCard';
import type { BoardHandlers } from './types';

type Props = {
  state: BuilderState;
  handlers: BoardHandlers;
  focusDayId: string | null;
  onFocusHandled: () => void;
};

// Cards win over the column behind them, so dropping on a card positions precisely. Keyboard drags
// have no pointer: keyboardTarget() parks the overlay's top-left corner on the chosen target, so
// the target is whichever droppable contains that corner (a card before its column).
const ARROWS: readonly string[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// The droppable whose rect contains a point (keyboard drags park the overlay's top-left corner there).
function containing(args: Parameters<CollisionDetection>[0], containers: typeof args.droppableContainers) {
  // Probe a little inside the corner so sub-pixel offsets of the preview cannot miss the target.
  const x = args.collisionRect.left + 8;
  const y = args.collisionRect.top + 8;
  return containers.filter((container) => {
    const rect = args.droppableRects.get(container.id);
    return rect !== undefined && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  });
}

const collisionDetection: CollisionDetection = (args) => {
  // A whole day is being dragged: only other day columns are targets.
  if (isColumnId(String(args.active.id))) {
    const columns = args.droppableContainers.filter((container) => isColumnId(String(container.id)));
    if (!args.pointerCoordinates) return containing(args, columns).slice(0, 1).map((c) => ({ id: c.id }));
    return closestCenter({ ...args, droppableContainers: columns });
  }

  // A card is being dragged: cards and the day drop targets behind them, never the sortable columns.
  const targets = args.droppableContainers.filter((container) => !isColumnId(String(container.id)));
  if (!args.pointerCoordinates) {
    const hits = containing(args, targets);
    const target = hits.find((container) => !isDayDropId(String(container.id))) ?? hits[0];
    return target ? [{ id: target.id }] : [];
  }
  const cardArgs = { ...args, droppableContainers: targets };
  const pointer = pointerWithin(cardArgs);
  const hits = pointer.length > 0 ? pointer : rectIntersection(cardArgs);
  const card = hits.find((hit) => !isDayDropId(String(hit.id)));
  return card ? [card] : hits.slice(0, 1);
};

// The horizontal board: day columns side by side in an overflow-x container with scroll-snap.
// Only this container scrolls sideways; the page body never does. dnd-kit auto-scrolls it when a
// dragged card nears the left or right edge.
export function Board({ state, handlers, focusDayId, onFocusHandled }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overDayId, setOverDayId] = useState<string | null>(null);
  const numbered = state.mode === 'relative';
  // The last target chosen by an arrow key. dnd-kit reports the new "over" target asynchronously, so a
  // quick second key press would otherwise start again from the old position.
  const keyboardOver = useRef<string | null>(null);

  // Arrow keys move the dragged card through the targets chosen by keyboardTarget(): up/down within
  // the day, left/right to the neighbouring day.
  const keyboardCoordinates: KeyboardCoordinateGetter = (event, { context: { active, over, droppableRects } }) => {
    if (!ARROWS.includes(event.code)) return undefined;
    event.preventDefault();
    if (!active) return undefined;
    const activeKey = String(active.id);
    const overKey = keyboardOver.current ?? (over ? String(over.id) : null);
    const target = isColumnId(activeKey)
      ? columnKeyboardTarget(state, activeKey, overKey, event.code as ArrowKey)
      : keyboardTarget(state, activeKey, overKey, event.code as ArrowKey);
    const rect = target ? droppableRects.get(target) : undefined;
    if (!rect) return undefined;
    keyboardOver.current = target;
    return { x: rect.left, y: rect.top };
  };

  const sensors = useSensors(
    // Press and hold a card for a moment to pick it up; a quick click or a scroll does not.
    useSensor(CardPointerSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(CardKeyboardSensor, { coordinateGetter: keyboardCoordinates }),
  );

  const activeSlot = activeId ? findSlot(state, activeId)?.slot : undefined;
  const activeDay = activeId && isColumnId(activeId) ? state.days.find((d) => d.id === dayIdFromColumnId(activeId)) : undefined;
  const nameOf = (id: string | number) => findSlot(state, String(id))?.slot.exercise.name ?? 'card';
  const dayNameOf = (id: string | number) => state.days.find((d) => d.id === dayIdFromColumnId(String(id)))?.name ?? 'Day';
  const positionOf = (id: string | number) => state.days.findIndex((d) => d.id === dayIdFromColumnId(String(id))) + 1;

  function dayOf(id: string | number | undefined): string | null {
    if (id === undefined) return null;
    const text = String(id);
    return isDayDropId(text) ? dayIdFromDropId(text) : (findSlot(state, text)?.day.id ?? null);
  }

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      isColumnId(String(active.id))
        ? `Picked up ${dayNameOf(active.id)}. Use the Left and Right arrow keys to move the day, Space to drop, Escape to cancel.`
        : `Picked up ${nameOf(active.id)}. Use the arrow keys to move it, Space to drop, Escape to cancel.`,
    onDragOver: ({ active, over }) => {
      if (isColumnId(String(active.id))) {
        return over ? `${dayNameOf(active.id)} is over position ${positionOf(over.id)} of ${state.days.length}.` : undefined;
      }
      if (!over) return `${nameOf(active.id)} is not over a drop target.`;
      const day = state.days.find((d) => d.id === dayOf(over.id));
      if (!day) return undefined;
      if (isDayDropId(String(over.id))) return `${nameOf(active.id)} is over ${day.name}.`;
      return over.id === active.id
        ? `${nameOf(active.id)} is in its original position in ${day.name}.`
        : `${nameOf(active.id)} is over ${nameOf(over.id)} in ${day.name}.`;
    },
    onDragEnd: ({ active, over }) => {
      if (isColumnId(String(active.id))) {
        const move = over ? resolveDayDrop(state, String(active.id), String(over.id)) : null;
        return move ? describeDayMove(state, move) : `${dayNameOf(active.id)} was dropped. Nothing changed.`;
      }
      const action = over ? resolveDrop(state, String(active.id), String(over.id)) : null;
      return action ? describeMove(state, action) : `${nameOf(active.id)} was dropped. Nothing changed.`;
    },
    onDragCancel: ({ active }) =>
      `Move cancelled. ${isColumnId(String(active.id)) ? dayNameOf(active.id) : nameOf(active.id)} stays where it was.`,
  };

  function handleDragStart({ active }: DragStartEvent) {
    keyboardOver.current = null;
    setActiveId(String(active.id));
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (isColumnId(String(active.id))) return;
    const target = dayOf(over?.id);
    setOverDayId(target && target !== findSlot(state, String(active.id))?.day.id ? target : null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    keyboardOver.current = null;
    setActiveId(null);
    setOverDayId(null);
    if (!over) return;
    if (isColumnId(String(active.id))) {
      const move = resolveDayDrop(state, String(active.id), String(over.id));
      if (move) handlers.onMoveDay(move.dayId, move.toIndex);
      return;
    }
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
            onUpdate={(patch) => handlers.onUpdateSlot(slot.id, patch)}
            onRemove={() => handlers.onRemoveSlot(slot.id)}
          />
        ))}
      </SortableContext>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h2 className="sr-only">Training days</h2>
      <div className="mx-auto flex w-full max-w-7xl shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 pt-3 text-sm">
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
        <button
          type="button"
          onClick={handlers.onAddDay}
          disabled={state.days.length >= MAX_CYCLE_DAYS}
          title={numbered ? `Up to ${MAX_CYCLE_DAYS} days` : 'Adding an 8th day switches to numbered days.'}
          className="rounded-lg border border-dashed border-graphite-700 px-3 py-1 text-sm font-medium text-graphite-300 transition-colors hover:border-aqua-500 hover:text-aqua-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add day
        </button>
        <button
          type="button"
          onClick={handlers.onOpenTemplates}
          className="rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-1 text-sm font-medium text-graphite-200 transition-colors hover:border-aqua-500 hover:text-aqua-300"
        >
          Templates
        </button>
        <span className={`text-xs text-graphite-400 ${numbered && state.days.length !== WEEK_DAYS ? '' : 'hidden sm:inline'}`}>
          {numbered && state.days.length !== WEEK_DAYS ? `Weekday names need exactly ${WEEK_DAYS} days.` : 'Empty days are rest days'}
        </span>
        <DragTip />
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
          keyboardOver.current = null;
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
          className={`min-h-0 flex-1 overflow-x-auto overflow-y-hidden ${activeId ? 'snap-none' : 'snap-x snap-proximity'}`}
        >
          {/* Training days share the width (between a minimum and a maximum), rest days stay narrow, and
              the row is centered. When the days cannot fit, the row overflows and the board scrolls sideways. */}
          <div className="flex h-full w-full items-start justify-center-safe gap-2.5 px-4 pb-4 pt-3">
          <SortableContext items={state.days.map((day) => columnId(day.id))} strategy={horizontalListSortingStrategy}>
          {state.days.map((day) => (
            <SortableDayColumn
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
            </SortableDayColumn>
          ))}
          </SortableContext>
          </div>
        </div>
        <DragOverlay>{activeSlot ? <CardPreview slot={activeSlot} /> : activeDay ? <DayPreview day={activeDay} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
