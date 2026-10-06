'use client';

import { estimateSessionMinutes, MAX_DAY_NAME_LENGTH, MUSCLES, MAX_DAYS_WITH_DUPLICATE, type Muscle, type ScheduleMode } from '@mesocycle/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { WEEKDAY_NAMES } from '../../lib/days';
import type { BuilderDay, BuilderSlot, BuilderState } from '../../lib/builder/types';
import { muscleLabel } from '../../lib/labels';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InlineText } from '../ui/InlineText';
import { DayMenu } from './DayMenu';
import { MuscleSection } from './MuscleSection';
import type { BoardHandlers } from './types';

type Props = {
  day: BuilderDay;
  dayCount: number;
  mode: ScheduleMode;
  takenWeekdays: ReadonlySet<number>;
  priorities: BuilderState['priorities'];
  handlers: BoardHandlers;
  // Renders the cards of one section; the board swaps in a sortable version for drag and drop.
  renderCards: (day: BuilderDay, muscle: Muscle, slots: BuilderSlot[]) => ReactNode;
  // When true the column scrolls into view and its name field takes focus (after Duplicate / Rename).
  focusName: boolean;
  onFocusNameHandled: () => void;
  // Lets the board register this column as a drop target.
  columnRef?: (element: HTMLElement | null) => void;
  isDropTarget?: boolean;
};

export function DayColumn({
  day,
  dayCount,
  mode,
  takenWeekdays,
  priorities,
  handlers,
  renderCards,
  focusName,
  onFocusNameHandled,
  columnRef,
  isDropTarget = false,
}: Props) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const nameId = `day-name-${day.id}`;
  const free = MUSCLES.filter((muscle) => !day.muscles.includes(muscle));

  useEffect(() => {
    if (!focusName) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    const input = document.getElementById(nameId) as HTMLInputElement | null;
    input?.focus();
    input?.select();
    onFocusNameHandled();
  }, [focusName, nameId, onFocusNameHandled]);

  const minutes = estimateSessionMinutes(day.slots.map((slot) => ({ sets: slot.sets, movementType: slot.exercise.movement_type })));

  function requestDelete() {
    if (day.muscles.length === 0 && day.slots.length === 0) handlers.onRemoveDay(day.id);
    else setConfirmingDelete(true);
  }

  return (
    <section
      ref={(element) => {
        rootRef.current = element;
        columnRef?.(element);
      }}
      id={`day-col-${day.id}`}
      aria-label={`${day.name} column`}
      data-testid="day-column"
      className={`flex max-h-[calc(100dvh-13rem)] w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-xl border bg-slate-100 sm:w-80 ${
        isDropTarget ? 'border-blue-600 ring-2 ring-blue-300' : 'border-slate-300'
      }`}
    >
      <header className="grid gap-1 border-b border-slate-300 p-3">
        <div className="flex items-center gap-1">
          <InlineText
            id={nameId}
            ariaLabel={`Day name for ${day.name}`}
            value={day.name}
            maxLength={MAX_DAY_NAME_LENGTH}
            onCommit={(name) => handlers.onRenameDay(day.id, name)}
            className="min-w-0 flex-1 text-base font-semibold"
          />
          <DayMenu
            dayName={day.name}
            canDelete={dayCount > 1}
            canDuplicate={dayCount < MAX_DAYS_WITH_DUPLICATE}
            onDuplicate={() => handlers.onDuplicateDay(day.id)}
            onRename={() => document.getElementById(nameId)?.focus()}
            onDelete={requestDelete}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-2 text-xs text-slate-700">
          {mode === 'calendar' && (
            <select
              aria-label={`Weekday for ${day.name}`}
              className="rounded border border-slate-300 bg-white px-1 py-0.5"
              value={day.weekday ?? ''}
              onChange={(e) => handlers.onSetWeekday(day.id, e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">Weekday…</option>
              {WEEKDAY_NAMES.map((label, value) => (
                <option key={label} value={value} disabled={takenWeekdays.has(value) && day.weekday !== value}>
                  {label}
                </option>
              ))}
            </select>
          )}
          {day.slots.length > 0 && (
            <span data-testid="day-duration" title="Estimated session length">
              ~{minutes} min
            </span>
          )}
          <span>
            {day.slots.length} exercise{day.slots.length === 1 ? '' : 's'}
          </span>
        </div>
      </header>

      <div className="grid flex-1 content-start gap-4 overflow-y-auto p-3">
        {day.muscles.length === 0 && <p className="rounded border border-dashed border-slate-400 p-4 text-center text-sm text-slate-700">Add a muscle group to get started.</p>}
        {day.muscles.map((muscle) => {
          const slots = day.slots.filter((slot) => slot.muscle === muscle);
          return (
            <MuscleSection
              key={muscle}
              muscle={muscle}
              priority={priorities[muscle] ?? 'normal'}
              slotCount={slots.length}
              onAddExercise={() => handlers.onAddExercise(day.id, muscle)}
              onRemove={() => handlers.onRemoveMuscle(day.id, muscle)}
            >
              {renderCards(day, muscle, slots)}
            </MuscleSection>
          );
        })}
      </div>

      <footer className="border-t border-slate-300 p-3">
        <select
          aria-label={`Add muscle group to ${day.name}`}
          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          value=""
          disabled={free.length === 0}
          onChange={(e) => e.target.value && handlers.onAddMuscle(day.id, e.target.value as Muscle)}
        >
          <option value="">+ Add muscle group…</option>
          {free.map((muscle) => (
            <option key={muscle} value={muscle}>
              {muscleLabel(muscle)}
            </option>
          ))}
        </select>
      </footer>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this day?"
        message={`“${day.name}” has ${day.muscles.length} muscle group(s) and ${day.slots.length} exercise(s). They will be deleted.`}
        confirmLabel="Delete day"
        onConfirm={() => {
          setConfirmingDelete(false);
          handlers.onRemoveDay(day.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </section>
  );
}
