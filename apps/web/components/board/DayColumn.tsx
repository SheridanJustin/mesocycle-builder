'use client';

import { estimateSessionMinutes, MAX_DAY_NAME_LENGTH } from '@mesocycle/shared';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BuilderDay } from '../../lib/builder/types';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InlineText } from '../ui/InlineText';
import { DayMenu } from './DayMenu';
import type { BoardHandlers } from './types';

type Props = {
  day: BuilderDay;
  copyTargets: { id: string; name: string }[];
  canDuplicate: boolean;
  canRemove: boolean;
  handlers: BoardHandlers;
  // The day's cards (the board renders them inside a sortable context).
  children: ReactNode;
  // When true the column scrolls into view and its name field takes focus (after Duplicate / Rename).
  focusName: boolean;
  onFocusNameHandled: () => void;
  // Lets the board register this column as a drop target.
  columnRef?: (element: HTMLElement | null) => void;
  isDropTarget?: boolean;
};

export function DayColumn({ day, copyTargets, canDuplicate, canRemove, handlers, children, focusName, onFocusNameHandled, columnRef, isDropTarget = false }: Props) {
  const [confirming, setConfirming] = useState<'clear' | 'remove' | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const nameId = `day-name-${day.id}`;
  const isRestDay = day.slots.length === 0;

  useEffect(() => {
    if (!focusName) return;
    rootRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    const input = document.getElementById(nameId) as HTMLInputElement | null;
    input?.focus();
    input?.select();
    onFocusNameHandled();
  }, [focusName, nameId, onFocusNameHandled]);

  const minutes = estimateSessionMinutes(day.slots.map((slot) => ({ sets: slot.sets, movementType: slot.exercise.movement_type })));

  return (
    <section
      ref={(element) => {
        rootRef.current = element;
        columnRef?.(element);
      }}
      id={`day-col-${day.id}`}
      aria-label={`${day.name} column`}
      data-testid="day-column"
      className={`flex max-h-[calc(100dvh-12rem)] w-[85vw] max-w-sm shrink-0 snap-start flex-col rounded-xl border bg-graphite-900 sm:w-80 ${
        isDropTarget ? 'border-aqua-400 ring-2 ring-aqua-700' : 'border-graphite-800'
      }`}
    >
      <header className={`grid gap-1 p-3 ${isRestDay ? '' : 'border-b border-graphite-800'}`}>
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
            hasExercises={!isRestDay}
            copyTargets={copyTargets}
            canDuplicate={canDuplicate}
            canRemove={canRemove}
            onCopyTo={(targetId) => handlers.onCopyDay(day.id, targetId)}
            onDuplicate={() => handlers.onCopyDay(day.id, null)}
            onRename={() => document.getElementById(nameId)?.focus()}
            onClear={() => setConfirming('clear')}
            onRemove={() => (isRestDay ? handlers.onRemoveDay(day.id) : setConfirming('remove'))}
          />
        </div>
        <p className="px-2 text-xs text-graphite-400">
          {isRestDay ? (
            <span data-testid="rest-day">Rest day</span>
          ) : (
            <>
              <span data-testid="day-duration" title="Estimated session length">
                ~{minutes} min
              </span>
              {' · '}
              {day.slots.length} exercise{day.slots.length === 1 ? '' : 's'}
            </>
          )}
        </p>
      </header>

      {!isRestDay && <div className="grid flex-1 content-start gap-2 overflow-y-auto p-3">{children}</div>}

      <footer className={`p-3 ${isRestDay ? '' : 'border-t border-graphite-800'}`}>
        <Button
          variant={isRestDay ? 'primary' : 'secondary'}
          size="lg"
          className="w-full"
          aria-label={`Add exercises to ${day.name}`}
          onClick={() => handlers.onOpenAddExercises(day.id)}
        >
          + Add
        </Button>
      </footer>

      <ConfirmDialog
        open={confirming !== null}
        title={confirming === 'clear' ? 'Clear this day?' : 'Remove this day?'}
        message={
          confirming === 'clear'
            ? `All ${day.slots.length} exercise(s) on “${day.name}” will be removed, making it a rest day.`
            : `“${day.name}” and its ${day.slots.length} exercise(s) will be removed.`
        }
        confirmLabel={confirming === 'clear' ? 'Clear day' : 'Remove day'}
        onConfirm={() => {
          if (confirming === 'clear') handlers.onClearDay(day.id);
          else handlers.onRemoveDay(day.id);
          setConfirming(null);
        }}
        onCancel={() => setConfirming(null)}
      />
    </section>
  );
}
