'use client';

import { EQUIPMENT_TYPES, MOVEMENT_TYPES, MUSCLES, type CreateExercise, type Equipment, type MovementType, type Muscle } from '@mesocycle/shared';
import { useState, type FormEvent } from 'react';
import { equipmentLabel, muscleLabel } from '../../lib/labels';
import { Button } from '../ui/Button';

type Props = {
  defaultMuscle: Muscle;
  submitting: boolean;
  error: string | null;
  onSubmit: (values: CreateExercise) => void;
  onCancel: () => void;
};

const field = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';

export function CustomExerciseForm({ defaultMuscle, submitting, error, onSubmit, onCancel }: Props) {
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState<Muscle>(defaultMuscle);
  const [secondary, setSecondary] = useState<Muscle[]>([]);
  const [equipment, setEquipment] = useState<Equipment>('dumbbell');
  const [movement, setMovement] = useState<MovementType>('isolation');
  const [localError, setLocalError] = useState<string | null>(null);

  function toggleSecondary(muscle: Muscle) {
    setSecondary((current) => (current.includes(muscle) ? current.filter((m) => m !== muscle) : [...current, muscle]));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length === 0) return setLocalError('Enter a name.');
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      primary_muscle: primary,
      secondary_muscles: secondary.filter((m) => m !== primary),
      equipment_type: equipment,
      movement_type: movement,
    });
  }

  const shown = localError ?? error;

  return (
    <form onSubmit={submit} className="grid gap-3" aria-label="Create custom exercise">
      <label className="block text-sm font-medium">
        Exercise name
        <input className={field} value={name} maxLength={255} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-sm font-medium">
        Primary muscle
        <select className={field} value={primary} onChange={(e) => setPrimary(e.target.value as Muscle)}>
          {MUSCLES.map((muscle) => (
            <option key={muscle} value={muscle}>
              {muscleLabel(muscle)}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend className="text-sm font-medium">Secondary muscles (optional)</legend>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {MUSCLES.filter((muscle) => muscle !== primary).map((muscle) => (
            <label key={muscle} className="flex items-center gap-1">
              <input type="checkbox" checked={secondary.includes(muscle)} onChange={() => toggleSecondary(muscle)} />
              {muscleLabel(muscle)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium">
          Equipment
          <select className={field} value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment)}>
            {EQUIPMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {equipmentLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Movement type
          <select className={field} value={movement} onChange={(e) => setMovement(e.target.value as MovementType)}>
            {MOVEMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>
      {shown && (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-900">
          {shown}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Back to search</Button>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create and add'}
        </Button>
      </div>
    </form>
  );
}
