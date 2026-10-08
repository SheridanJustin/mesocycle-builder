import { KeyboardSensor, MouseSensor, TouchSensor } from '@dnd-kit/core';

// Controls inside a card keep working normally: pressing on them never starts a drag.
const CONTROLS = 'input, select, textarea, button, a, label, [contenteditable="true"]';

type ClosestCapable = { closest: (selector: string) => unknown };

export function startsOnControl(target: EventTarget | null): boolean {
  const element = target as Partial<ClosestCapable> | null;
  return typeof element?.closest === 'function' && element.closest(CONTROLS) !== null;
}

const [mouseActivator] = MouseSensor.activators;
const [touchActivator] = TouchSensor.activators;
const [keyboardActivator] = KeyboardSensor.activators;

// Press and hold anywhere on a card or day header (except its controls) to drag it: the mouse...
export class CardMouseSensor extends MouseSensor {
  static activators: typeof MouseSensor.activators = [
    {
      eventName: 'onMouseDown',
      handler: (event, options) => !startsOnControl(event.nativeEvent.target) && mouseActivator!.handler(event, options),
    },
  ];
}

// ...and a finger. Touch has its own sensor (not pointer events): once the hold completes it can stop
// the browser from turning the finger's movement into a scroll, which pointer events cannot do, so
// the card moves. A quick swipe (before the hold completes) still scrolls the board.
export class CardTouchSensor extends TouchSensor {
  static activators: typeof TouchSensor.activators = [
    {
      eventName: 'onTouchStart',
      handler: (event, options) => !startsOnControl(event.nativeEvent.target) && touchActivator!.handler(event, options),
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
