'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mesocycle-builder:drag-tip-dismissed';

// A visible hint that cards and days can be dragged. It can be dismissed; the choice is
// remembered in this browser only (a convenience, so failures are ignored).
export function DragTip() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // Storage unavailable (private mode, blocked): keep showing the tip.
    }
  }, []);

  if (dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Ignored: the tip simply comes back next time.
    }
  }

  return (
    <p
      data-testid="drag-tip"
      className="inline-flex items-center gap-2 rounded-full border border-aqua-800 bg-aqua-950/60 py-0.5 pl-3 pr-1 text-xs text-aqua-100"
    >
      <span aria-hidden="true" className="text-sm">
        ✋
      </span>
      <span className="hidden sm:inline">
        <strong className="font-semibold">Tip:</strong> press and hold an exercise to drag it, within a day or to another day. Drag a day&apos;s
        header to reorder days.
      </span>
      {/* Phones get the short version, so the board keeps its space. */}
      <span className="sm:hidden">
        <strong className="font-semibold">Tip:</strong> press and hold exercises or day headers to drag them.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="grid h-5 w-5 place-items-center rounded-full text-aqua-300 hover:bg-aqua-900 hover:text-aqua-100"
      >
        ✕
      </button>
    </p>
  );
}
