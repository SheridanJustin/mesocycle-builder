import { KeyboardSensor, PointerSensor } from '@dnd-kit/core';

// Controls inside a card keep working normally: pressing on them never starts a drag.
const CONTROLS = 'input, select, textarea, button, a, label, [contenteditable="true"]';

type ClosestCapable = { closest: (selector: string) => unknown };

export function startsOnControl(target: EventTarget | null): boolean {
  const element = target as Partial<ClosestCapable> | null;
  return typeof element?.closest === 'function' && element.closest(CONTROLS) !== null;
}

const [pointerActivator] = PointerSensor.activators;
const [keyboardActivator] = KeyboardSensor.activators;

// Press and hold anywhere on a card (except its controls) to drag it.
export class CardPointerSensor extends PointerSensor {
  static activators: typeof PointerSensor.activators = [
    {
      eventName: 'onPointerDown',
      handler: (event, options) => !startsOnControl(event.nativeEvent.target) && pointerActivator!.handler(event, options),
    },
  ];
}

// Space/Enter picks a card up only when the card itself has focus, not one of its fields.
export class CardKeyboardSensor extends KeyboardSensor {
  static activators: typeof KeyboardSensor.activators = [
    {
      eventName: 'onKeyDown',
      handler: (event, options, context) => event.target === event.currentTarget && keyboardActivator!.handler(event, options, context),
    },
  ];
}
