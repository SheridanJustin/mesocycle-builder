'use client';

import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { columnId, dayDropId } from '../../lib/builder/drop';
import { DayColumn } from './DayColumn';

type Props = Omit<Parameters<typeof DayColumn>[0], 'columnRef' | 'isDropTarget' | 'drag'> & { highlighted: boolean };

// A day column is both a drop target for cards and a sortable item itself: press and hold its
// header to move the whole day (keyboard: focus the header, Space, Left/Right, Space).
export function SortableDayColumn({ highlighted, ...props }: Props) {
  const { setNodeRef: setDropRef } = useDroppable({ id: dayDropId(props.day.id) });
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId(props.day.id),
    attributes: { role: 'group', roleDescription: 'draggable day' },
  });

  return (
    <DayColumn
      {...props}
      columnRef={(element) => {
        setDropRef(element);
        setNodeRef(element);
      }}
      isDropTarget={highlighted}
      drag={{
        handleRef: setActivatorNodeRef,
        handleProps: { ...attributes, ...listeners },
        style: { transform: CSS.Translate.toString(transform), transition },
        isDragging,
      }}
    />
  );
}
