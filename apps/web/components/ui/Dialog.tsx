'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  // Docks the dialog to the right edge as a side panel.
  side?: boolean;
};

// Native <dialog>: the browser handles focus trapping, Escape and the modal backdrop.
export function Dialog({ open, title, onClose, children, side = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const placement = side
    ? 'ml-auto mr-0 h-dvh max-h-dvh w-full max-w-md rounded-none'
    : 'm-auto w-full max-w-md rounded-lg';

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={`${placement} bg-white p-0 text-slate-900 shadow-xl`}
    >
      {open && (
        <div className="flex max-h-dvh flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" aria-label="Close dialog" onClick={onClose} className="rounded p-1 text-slate-600 hover:bg-slate-100">
              ✕
            </button>
          </div>
          <div className="overflow-y-auto p-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
