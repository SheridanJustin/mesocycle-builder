import type { ButtonHTMLAttributes, Ref } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { exerciseName: string; handleRef?: Ref<HTMLButtonElement> };

// The only drag activator, so the card's other controls stay usable. `touch-none` lets touch
// users drag it without scrolling the board. Keyboard users focus it and press Space.
export function DragHandle({ exerciseName, handleRef, className = '', ...rest }: Props) {
  return (
    <button
      ref={handleRef}
      type="button"
      aria-label={`Drag ${exerciseName}`}
      className={`mt-0.5 cursor-grab touch-none rounded px-1 text-lg leading-none text-slate-600 hover:bg-slate-100 active:cursor-grabbing ${className}`}
      {...rest}
    >
      <span aria-hidden="true">⠿</span>
    </button>
  );
}
