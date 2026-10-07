'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ExerciseCard } from './ExerciseCard';

type CardProps = Parameters<typeof ExerciseCard>[0];

// The whole card is the drag target: press and hold it (anywhere but its controls) and move it.
// Keyboard: focus the card, press Space, move with the arrow keys, press Space to drop.
export function SortableExerciseCard(props: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.slot.id,
    attributes: { role: 'group', roleDescription: 'draggable exercise' },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      aria-label={`Move ${props.slot.exercise.name}`}
      title="Press and hold to drag"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cursor-grab touch-manipulation select-none rounded-xl [-webkit-touch-callout:none] active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <ExerciseCard {...props} />
    </div>
  );
}
