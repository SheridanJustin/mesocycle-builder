'use client';

import { useDroppable } from '@dnd-kit/core';
import { dayDropId } from '../../lib/builder/drop';
import { DayColumn } from './DayColumn';

type Props = Omit<Parameters<typeof DayColumn>[0], 'columnRef' | 'isDropTarget'> & { highlighted: boolean };

// Registers a day column as a drop target so cards can be dragged across the horizontal board.
export function DroppableDayColumn({ highlighted, ...props }: Props) {
  const { setNodeRef } = useDroppable({ id: dayDropId(props.day.id) });
  return <DayColumn {...props} columnRef={setNodeRef} isDropTarget={highlighted} />;
}
