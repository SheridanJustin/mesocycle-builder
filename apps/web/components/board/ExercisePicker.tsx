'use client';

import { EQUIPMENT_TYPES, MUSCLES, type Equipment, type Exercise, type Muscle } from '@mesocycle/shared';
import type { CatalogFilters } from '../../lib/builder/use-exercise-search';
import { equipmentLabel, muscleLabel } from '../../lib/labels';
import { Button } from '../ui/Button';

type Props = {
  filters: CatalogFilters;
  items: Exercise[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  onFiltersChange: (filters: CatalogFilters) => void;
  onPick: (exercise: Exercise) => void;
  onLoadMore: () => void;
  onCreateCustom: () => void;
};

const field = 'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm';

// Presentational: search box, muscle/equipment filters and the result list.
export function ExercisePicker({ filters, items, loading, error, hasMore, onFiltersChange, onPick, onLoadMore, onCreateCustom }: Props) {
  return (
    <div className="grid gap-3">
      <label className="block text-sm font-medium">
        Search exercises
        <input
          type="search"
          className={`${field} mt-1`}
          value={filters.search}
          placeholder="e.g. bench press"
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium">
          Muscle
          <select className={`${field} mt-1`} value={filters.muscle} onChange={(e) => onFiltersChange({ ...filters, muscle: e.target.value as Muscle | '' })}>
            <option value="">All muscles</option>
            {MUSCLES.map((muscle) => (
              <option key={muscle} value={muscle}>
                {muscleLabel(muscle)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Equipment
          <select className={`${field} mt-1`} value={filters.equipment} onChange={(e) => onFiltersChange({ ...filters, equipment: e.target.value as Equipment | '' })}>
            <option value="">All equipment</option>
            {EQUIPMENT_TYPES.map((equipment) => (
              <option key={equipment} value={equipment}>
                {equipmentLabel(equipment)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button onClick={onCreateCustom}>Create custom exercise</Button>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 p-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <ul aria-label="Exercise results" className="grid gap-1">
        {items.map((exercise) => (
          <li key={exercise.id}>
            <button
              type="button"
              onClick={() => onPick(exercise)}
              className="w-full rounded-md border border-slate-200 bg-white p-2 text-left hover:border-blue-600 hover:bg-blue-50"
            >
              <span className="block text-sm font-medium">{exercise.name}</span>
              <span className="block text-xs text-slate-700">
                {muscleLabel(exercise.primary_muscle)} · {equipmentLabel(exercise.equipment_type)} · {exercise.movement_type}
                {exercise.is_custom ? ' · custom' : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!loading && !error && items.length === 0 && <p className="text-sm text-slate-600">No exercises match. Try another search, or create a custom exercise.</p>}
      {loading && <p className="text-sm text-slate-600">Loading…</p>}
      {hasMore && !loading && <Button onClick={onLoadMore}>Load more</Button>}
    </div>
  );
}
