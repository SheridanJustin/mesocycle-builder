'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

type Props = {
  dayName: string;
  hasExercises: boolean;
  // Other days the exercises can be copied into.
  copyTargets: { id: string; name: string }[];
  canDuplicate: boolean;
  canRemove: boolean;
  onCopyTo: (dayId: string) => void;
  onDuplicate: () => void;
  onRename: () => void;
  onClear: () => void;
  onRemove: () => void;
};

const item = 'block w-full px-3 py-1.5 text-left text-sm text-graphite-100 hover:bg-graphite-700 disabled:text-graphite-600';

export function DayMenu({ dayName, hasExercises, copyTargets, canDuplicate, canRemove, onCopyTo, onDuplicate, onRename, onClear, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') setOpen(false);
      if (event instanceof MouseEvent && ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={ref} className="relative">
      <Button size="sm" variant="ghost" aria-label={`${dayName} menu`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        ⋯
      </Button>
      {open && (
        <div
          role="menu"
          aria-label={`${dayName} actions`}
          className="absolute right-0 z-20 mt-1 max-h-96 w-52 overflow-y-auto rounded-xl border border-graphite-700 bg-graphite-800 py-1 shadow-2xl shadow-black/50"
        >
          <button role="menuitem" type="button" className={item} onClick={() => choose(onRename)}>
            Rename
          </button>
          {hasExercises && canDuplicate && (
            <button role="menuitem" type="button" className={item} onClick={() => choose(onDuplicate)}>
              Duplicate as new day
            </button>
          )}
          {hasExercises && copyTargets.length > 0 && (
            <div role="group" aria-label="Copy exercises to" className="border-t border-graphite-700 pt-1">
              <p className="px-3 py-1 text-xs uppercase tracking-wide text-graphite-400">Copy exercises to</p>
              {copyTargets.map((target) => (
                <button key={target.id} role="menuitem" type="button" className={item} onClick={() => choose(() => onCopyTo(target.id))}>
                  {target.name}
                </button>
              ))}
            </div>
          )}
          {(hasExercises || canRemove) && (
            <div className="border-t border-graphite-700 pt-1">
              {hasExercises && (
                <button role="menuitem" type="button" className={`${item} text-snow-300`} onClick={() => choose(onClear)}>
                  Clear (make rest day)
                </button>
              )}
              {canRemove && (
                <button role="menuitem" type="button" className={`${item} text-snow-300`} onClick={() => choose(onRemove)}>
                  Remove day
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
