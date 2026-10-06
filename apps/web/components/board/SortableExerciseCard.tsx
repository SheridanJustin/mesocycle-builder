'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandle } from './DragHandle';
import { ExerciseCard } from './ExerciseCard';

type CardProps = Parameters<typeof ExerciseCard>[0];

// Adds sortable behaviour to the presentational card. The dragged card stays in place, dimmed;
// the board renders a preview in a DragOverlay.
export function SortableExerciseCard(props: Omit<CardProps, 'dragHandle'>) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: props.slot.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : undefined}
    >
      <ExerciseCard
        {...props}
        dragHandle={<DragHandle exerciseName={props.slot.exercise.name} handleRef={setActivatorNodeRef} {...attributes} {...listeners} />}
      />
    </div>
  );
}
