'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/Button';

type Props = {
  dayName: string;
  canDelete: boolean;
  canDuplicate: boolean;
  onDuplicate: () => void;
  onRename: () => void;
  onDelete: () => void;
};

const item = 'block w-full px-3 py-1.5 text-left text-sm hover:bg-slate-100 disabled:text-slate-400';

export function DayMenu({ dayName, canDelete, canDuplicate, onDuplicate, onRename, onDelete }: Props) {
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
        <div role="menu" aria-label={`${dayName} actions`} className="absolute right-0 z-20 mt-1 w-40 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <button role="menuitem" type="button" className={item} disabled={!canDuplicate} onClick={() => choose(onDuplicate)}>
            Duplicate
          </button>
          <button role="menuitem" type="button" className={item} onClick={() => choose(onRename)}>
            Rename
          </button>
          <button role="menuitem" type="button" className={`${item} text-red-800`} disabled={!canDelete} onClick={() => choose(onDelete)}>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
