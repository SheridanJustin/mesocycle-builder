'use client';

import type { Exercise, Muscle } from '@mesocycle/shared';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { useExerciseSearch, type CatalogFilters } from '../../lib/builder/use-exercise-search';
import { muscleLabel } from '../../lib/labels';
import { Dialog } from '../ui/Dialog';
import { CustomExerciseForm } from './CustomExerciseForm';
import { ExercisePicker } from './ExercisePicker';

type Props = {
  // The section being filled; null keeps the panel closed.
  target: { dayName: string; muscle: Muscle } | null;
  onPick: (exercise: Exercise) => void;
  onClose: () => void;
};

// Container: owns fetching and the create-custom call; the pieces it renders are presentational.
export function CatalogPanel({ target, onPick, onClose }: Props) {
  const open = target !== null;
  const [filters, setFilters] = useState<CatalogFilters>({ search: '', muscle: '', equipment: '' });
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Results default to the section's muscle each time the panel opens.
  useEffect(() => {
    if (target) {
      setFilters({ search: '', muscle: target.muscle, equipment: '' });
      setCreating(false);
      setCreateError(null);
    }
    // Reset only when the panel (re)opens for a different section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.dayName, target?.muscle, open]);

  const result = useExerciseSearch(open, filters);

  async function createCustom(values: Parameters<typeof api.createExercise>[0]) {
    setSubmitting(true);
    setCreateError(null);
    try {
      onPick(await api.createExercise(values));
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Could not create the exercise');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} side title={target ? `Add exercise · ${target.dayName} · ${muscleLabel(target.muscle)}` : 'Add exercise'} onClose={onClose}>
      {creating && target ? (
        <CustomExerciseForm
          defaultMuscle={target.muscle}
          submitting={submitting}
          error={createError}
          onSubmit={(values) => void createCustom(values)}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <ExercisePicker
          filters={filters}
          items={result.items}
          loading={result.loading}
          error={result.error}
          hasMore={result.nextCursor !== null}
          onFiltersChange={setFilters}
          onPick={onPick}
          onLoadMore={result.loadMore}
          onCreateCustom={() => setCreating(true)}
        />
      )}
    </Dialog>
  );
}
