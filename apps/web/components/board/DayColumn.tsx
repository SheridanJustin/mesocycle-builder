'use client';

import { estimateSessionMinutes, MAX_DAY_NAME_LENGTH } from '@mesocycle/shared';
import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import type { BuilderDay } from '../../lib/builder/types';
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
  // Lets the board reorder whole days: the header is the drag handle.
  drag?: {
    handleRef: (element: HTMLElement | null) => void;
    handleProps: HTMLAttributes<HTMLElement>;
    style: CSSProperties;
    isDragging: boolean;
  };
};

export function DayColumn({
  day,
  copyTargets,
  canDuplicate,
  canRemove,
  handlers,
  children,
  focusName,
  onFocusNameHandled,
  columnRef,
  isDropTarget = false,
  drag,
}: Props) {
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

  const weeklySets = day.slots.reduce((sum, slot) => sum + slot.sets, 0);
  const pill = 'rounded-full bg-graphite-800 px-2 py-0.5 text-[11px] font-medium text-graphite-200';

  return (
    <section
      ref={(element) => {
        rootRef.current = element;
        columnRef?.(element);
      }}
      id={`day-col-${day.id}`}
      aria-label={`${day.name} column`}
      data-testid="day-column"
      style={drag?.style}
      className={`relative flex ${drag?.isDragging ? 'z-10 opacity-40' : ''} max-h-full snap-start flex-col rounded-2xl border ${isRestDay ? 'w-max min-w-28 max-w-56 shrink-0' : 'w-[min(calc(100vw-4.5rem),20rem)] shrink-0 sm:w-56'} ${
        isRestDay ? 'bg-graphite-900/40' : 'bg-graphite-900/90 shadow-lg shadow-black/30'
      } ${isDropTarget ? 'border-aqua-400 ring-2 ring-aqua-700' : isRestDay ? 'border-graphite-800/70 border-dashed' : 'border-graphite-800'}`}
    >
      {/* No overflow clipping on the column: the day menu must be able to extend past short (rest-day) columns. */}
      {/* Rest days keep the bar's space (invisible) so every day name sits on the same line. */}
      <div aria-hidden="true" className={`mx-3 h-0.5 rounded-full bg-gradient-to-r from-aqua-500 via-verdigris-500 to-transparent ${isRestDay ? 'invisible' : ''}`} />
      <header
        ref={drag?.handleRef}
        {...drag?.handleProps}
        aria-label={drag ? `Move ${day.name}` : undefined}
        title={drag ? 'Press and hold to move this day' : undefined}
        className={`rounded-t-2xl pb-2 pt-2 ${isRestDay ? 'px-1.5' : 'px-2.5'} ${drag ? 'cursor-grab touch-manipulation select-none [-webkit-touch-callout:none] active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-aqua-400' : ''}`}
      >
        <div className="flex items-center gap-1">
          {drag && (
            // A finger-sized handle (phones snap a touch to the nearest control, so a tiny grip next
            // to the name field would focus the field instead of picking the day up).
            <span
              aria-hidden="true"
              data-testid="day-grip"
              className="-my-1 -ml-1.5 grid h-8 w-7 shrink-0 place-items-center rounded-md text-graphite-400 hover:bg-graphite-800 hover:text-graphite-200"
            >
              <svg viewBox="0 0 8 14" className="h-3.5 w-2 fill-current">
                <circle cx="2" cy="2" r="1.2" />
                <circle cx="6" cy="2" r="1.2" />
                <circle cx="2" cy="7" r="1.2" />
                <circle cx="6" cy="7" r="1.2" />
                <circle cx="2" cy="12" r="1.2" />
                <circle cx="6" cy="12" r="1.2" />
              </svg>
            </span>
          )}
          <InlineText
            id={nameId}
            ariaLabel={`Day name for ${day.name}`}
            value={day.name}
            maxLength={MAX_DAY_NAME_LENGTH}
            onCommit={(name) => handlers.onRenameDay(day.id, name)}
            title={day.name}
            // A rest-day column grows with its name (up to its max width), so the name is never cut off.
            autoSize={isRestDay}
            wrapperClassName="min-w-0 flex-1"
            className={`min-w-0 flex-1 text-[15px] font-semibold ${isRestDay ? 'px-1! text-graphite-300' : ''}`}
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
        <div className="mt-1 flex flex-wrap gap-1 px-2">
          {isRestDay ? (
            <span data-testid="rest-day" className="rounded-full px-0.5 text-[11px] font-medium uppercase tracking-wider text-graphite-400">
              Rest day
            </span>
          ) : (
            <>
              <span className={pill}>
                {day.slots.length} exercise{day.slots.length === 1 ? '' : 's'}
              </span>
              <span className={pill}>{weeklySets} sets</span>
              <span className={pill} data-testid="day-duration" title="Estimated session length">
                ~{minutes} min
              </span>
            </>
          )}
        </div>
      </header>

      {!isRestDay && <div className="grid flex-1 content-start gap-2 overflow-y-auto px-2 pb-1">{children}</div>}

      {/* Zero intrinsic width: the button's text never widens a rest-day column (it wraps instead). */}
      <footer className="w-0 min-w-full p-2.5">
        <button
          type="button"
          aria-label={`Add exercises to ${day.name}`}
          onClick={() => handlers.onOpenAddExercises(day.id)}
          className={`w-full rounded-xl border border-dashed font-medium transition-colors ${
            isRestDay
              ? 'border-graphite-700 px-2 py-5 text-sm text-graphite-400 hover:border-aqua-500 hover:bg-aqua-950/40 hover:text-aqua-300'
              : 'border-graphite-700 py-2 text-sm text-graphite-300 hover:border-aqua-500 hover:bg-aqua-950/40 hover:text-aqua-300'
          }`}
        >
          <span aria-hidden="true">+</span> Add exercises
        </button>
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
