'use client';

import { EQUIPMENT_TYPES, MUSCLES, type CreateExercise, type Equipment, type Exercise, type Muscle } from '@mesocycle/shared';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { useExerciseSearch, type CatalogFilters } from '../../lib/builder/use-exercise-search';
import { equipmentLabel, muscleLabel } from '../../lib/labels';
import { Button } from '../ui/Button';
import { Dialog } from '../ui/Dialog';
import { CustomExerciseForm } from './CustomExerciseForm';

type Props = {
  // The day being filled; null keeps the panel closed.
  dayName: string | null;
  onAdd: (exercises: Exercise[]) => void;
  onClose: () => void;
};

const EMPTY_FILTERS: CatalogFilters = { search: '', muscles: [], equipment: '' };

// Picks one or many exercises for a day. Muscle chips filter the list (several at once); ticked
// exercises stay selected while filters change. Container: it fetches and creates custom exercises.
export function AddExercisesPanel({ dayName, onAdd, onClose }: Props) {
  const open = dayName !== null;
  const [filters, setFilters] = useState<CatalogFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const result = useExerciseSearch(open, filters);

  useEffect(() => {
    if (open) {
      setFilters(EMPTY_FILTERS);
      setSelected([]);
      setCreating(false);
      setCreateError(null);
    }
  }, [open, dayName]);

  const isSelected = (exercise: Exercise) => selected.some((s) => s.id === exercise.id);
  const toggle = (exercise: Exercise) =>
    setSelected((current) => (isSelected(exercise) ? current.filter((s) => s.id !== exercise.id) : [...current, exercise]));
  const toggleMuscle = (muscle: Muscle) =>
    setFilters((f) => ({ ...f, muscles: f.muscles.includes(muscle) ? f.muscles.filter((m) => m !== muscle) : [...f.muscles, muscle] }));

  async function createCustom(values: CreateExercise) {
    setSubmitting(true);
    setCreateError(null);
    try {
      const created = await api.createExercise(values);
      setSelected((current) => [...current, created]);
      setCreating(false);
      setFilters({ ...EMPTY_FILTERS, search: created.name });
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create the exercise');
    } finally {
      setSubmitting(false);
    }
  }

  const field = 'w-full rounded-md border border-graphite-700 bg-graphite-950 px-2 py-1.5 text-sm text-graphite-50';

  return (
    <Dialog open={open} side title={dayName ? `Add exercises · ${dayName}` : 'Add exercises'} onClose={onClose}>
      {creating ? (
        <CustomExerciseForm
          defaultMuscle={filters.muscles[0] ?? 'chest'}
          submitting={submitting}
          error={createError}
          onSubmit={(values) => void createCustom(values)}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className="grid gap-3 pb-20">
          <input
            type="search"
            aria-label="Search exercises"
            placeholder="Search exercises"
            className={field}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />

          <div role="group" aria-label="Filter by muscle" className="flex flex-wrap gap-1.5">
            {MUSCLES.map((muscle) => {
              const on = filters.muscles.includes(muscle);
              return (
                <button
                  key={muscle}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleMuscle(muscle)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                    on ? 'border-aqua-400 bg-aqua-900 text-aqua-100' : 'border-graphite-700 bg-graphite-800 text-graphite-200 hover:bg-graphite-700'
                  }`}
                >
                  {muscleLabel(muscle)}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Equipment"
              className={field}
              value={filters.equipment}
              onChange={(e) => setFilters({ ...filters, equipment: e.target.value as Equipment | '' })}
            >
              <option value="">All equipment</option>
              {EQUIPMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {equipmentLabel(type)}
                </option>
              ))}
            </select>
            <Button size="sm" className="shrink-0" onClick={() => setCreating(true)}>
              + Custom
            </Button>
          </div>

          {result.error && (
            <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-2 text-sm text-snow-100">
              {result.error}
            </p>
          )}

          <ul aria-label="Exercise results" className="grid gap-1">
            {result.items.map((exercise) => (
              <li key={exercise.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-2 ${
                    isSelected(exercise) ? 'border-aqua-500 bg-aqua-950' : 'border-graphite-800 bg-graphite-900 hover:border-graphite-600'
                  }`}
                >
                  <input type="checkbox" className="mt-1 accent-aqua-500" checked={isSelected(exercise)} onChange={() => toggle(exercise)} />
                  <span>
                    <span className="block text-sm font-medium">{exercise.name}</span>
                    <span className="block text-xs text-graphite-300">
                      {muscleLabel(exercise.primary_muscle)} · {equipmentLabel(exercise.equipment_type)} · {exercise.movement_type}
                      {exercise.is_custom ? ' · custom' : ''}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {!result.loading && !result.error && result.items.length === 0 && (
            <p className="text-sm text-graphite-300">No exercises match. Try another search, or create a custom one.</p>
          )}
          {result.loading && <p className="text-sm text-graphite-300">Loading…</p>}
          {result.nextCursor && !result.loading && <Button onClick={result.loadMore}>Load more</Button>}

          <div className="fixed bottom-0 right-0 flex w-full max-w-md items-center justify-between gap-2 border-t border-graphite-800 bg-graphite-900 p-3">
            <span className="text-sm text-graphite-300" aria-live="polite">
              {selected.length} selected
            </span>
            <Button variant="primary" size="lg" disabled={selected.length === 0} onClick={() => onAdd(selected)}>
              {selected.length === 1 ? 'Add 1 exercise' : `Add ${selected.length} exercises`}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
