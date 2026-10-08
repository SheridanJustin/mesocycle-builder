'use client';

import type { LogSet, WorkoutDetail, WorkoutExercise } from '@mesocycle/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiClientError } from '../../lib/api-client';
import { resolveEntry, type Draft, type SetRow } from '../../lib/workout-entry';
import { usePreferences } from '../preferences/PreferencesContext';
import { rowKey, type RowError } from './ExerciseLog';
import { WorkoutLogger } from './WorkoutLogger';

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function without<T>(record: Readonly<Record<string, T>>, key: string): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

// Loads a workout and saves each set as it is ticked off. Saves run one at a time, so every
// response (the whole workout, with its PR badges) includes the earlier ones.
export function WorkoutContainer({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { showRir, weightUnit } = usePreferences();
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, RowError>>({});
  const [extraRows, setExtraRows] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [finishing, setFinishing] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    api
      .getWorkout(sessionId)
      .then((value) => !cancelled && setWorkout(value))
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof ApiClientError && e.status === 404 ? 'Workout not found.' : message(e, 'Could not load the workout.'));
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function save(key: string, run: () => Promise<WorkoutDetail>) {
    setPending((current) => new Set(current).add(key));
    setError(null);
    queue.current = queue.current.then(async () => {
      try {
        setWorkout(await run());
        setDrafts((current) => without(current, key));
      } catch (e) {
        setError(`Could not save the set: ${message(e, 'unknown error')}`);
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    });
  }

  function logRow(item: WorkoutExercise, row: SetRow) {
    const key = rowKey(item.id, row.setNumber);
    const resolved = resolveEntry(drafts[key] ?? { weight: '', reps: '' }, row, item);
    if (!resolved.ok) {
      setErrors((current) => ({ ...current, [key]: { field: resolved.field, message: resolved.message } }));
      return;
    }
    setErrors((current) => without(current, key));
    const body: LogSet = resolved.value;
    save(key, () => api.logSet(item.id, row.setNumber, body));
  }

  function onToggle(item: WorkoutExercise, row: SetRow) {
    const key = rowKey(item.id, row.setNumber);
    if (row.logged) {
      setErrors((current) => without(current, key));
      save(key, () => api.deleteSet(item.id, row.setNumber));
    } else {
      logRow(item, row);
    }
  }

  async function onFinish() {
    setFinishing(true);
    setError(null);
    try {
      await queue.current;
      await api.updateSession(sessionId, 'completed');
      if (workout) router.push(`/mesocycles/${workout.mesocycle.id}`);
    } catch (e) {
      setError(`Could not finish the workout: ${message(e, 'unknown error')}`);
      setFinishing(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-4 text-snow-100">
          {loadError}
        </p>
        <Link href="/mesocycles" className="mt-4 inline-block text-aqua-300 underline">
          Back to mesocycles
        </Link>
      </main>
    );
  }
  if (!workout) return <p className="p-6 text-graphite-300">Loading…</p>;

  return (
    <WorkoutLogger
      workout={workout}
      unit={weightUnit}
      showRir={showRir}
      extraRows={extraRows}
      drafts={drafts}
      pending={pending}
      errors={errors}
      error={error}
      finishing={finishing}
      onChange={(key, field, value) => {
        setDrafts((current) => ({ ...current, [key]: { ...(current[key] ?? currentValues(workout, key)), [field]: value } }));
        setErrors((current) => without(current, key));
      }}
      onToggle={onToggle}
      onCommit={logRow}
      onAddSet={(itemId) => setExtraRows((current) => ({ ...current, [itemId]: (current[itemId] ?? 0) + 1 }))}
      onRemoveSet={(itemId) => setExtraRows((current) => ({ ...current, [itemId]: Math.max(0, (current[itemId] ?? 0) - 1) }))}
      onFinish={() => void onFinish()}
    />
  );
}

// A logged set's values as text, so editing one field keeps the other.
function currentValues(workout: WorkoutDetail, key: string): Draft {
  const [itemId, n] = key.split(':');
  const set = workout.exercises.find((item) => item.id === itemId)?.sets.find((s) => s.set_number === Number(n));
  if (!set) return { weight: '', reps: '' };
  return { weight: set.weight !== null && set.weight > 0 ? String(set.weight) : 'BW', reps: String(set.reps) };
}
