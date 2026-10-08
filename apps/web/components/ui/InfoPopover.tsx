'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

type Props = {
  // Accessible name of the trigger, e.g. "What do MV, MEV, MAV and MRV mean?"
  label: string;
  children: ReactNode;
  // Show on mouse hover as well as on click/focus (for short explanations).
  openOnHover?: boolean;
  // Visible trigger content; defaults to an "i" icon.
  trigger?: ReactNode;
  align?: 'left' | 'right';
  className?: string;
  // Classes for a custom trigger (e.g. a full-width tile).
  triggerClassName?: string;
  testId?: string;
};

// A small non-modal explanation panel. Opens on click (and on hover/focus when openOnHover),
// closes on Escape or a click outside.
export function InfoPopover({ label, children, openOnHover = false, trigger, align = 'left', className = '', triggerClassName = 'inline-flex items-center gap-1', testId }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const panelId = useId();

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

  const hover = openOnHover ? { onMouseEnter: () => setOpen(true), onMouseLeave: () => setOpen(false) } : {};

  return (
    <span ref={ref} className={`relative ${className || 'inline-flex'}`} {...hover}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onFocus={openOnHover ? () => setOpen(true) : undefined}
        onBlur={openOnHover ? () => setOpen(false) : undefined}
        className={
          trigger
            ? triggerClassName
            : 'grid h-5 w-5 place-items-center rounded-full border border-graphite-600 text-[11px] font-bold text-graphite-300 hover:border-aqua-400 hover:text-aqua-300'
        }
      >
        {trigger ?? <span aria-hidden="true">i</span>}
      </button>
      {open && (
        <span
          id={panelId}
          role="dialog"
          aria-label={label}
          data-testid={testId}
          className={`absolute top-full z-50 mt-2 block w-80 rounded-xl border border-graphite-700 bg-graphite-900 p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-graphite-200 shadow-2xl shadow-black/60 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
