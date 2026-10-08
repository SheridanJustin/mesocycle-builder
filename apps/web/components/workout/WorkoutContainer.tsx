'use client';

import type { LogSet, WorkoutDetail, WorkoutExercise } from '@mesocycle/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, ApiClientError } from '../../lib/api-client';
import { resolveEntry, weeksLabel, type Draft, type SetRow } from '../../lib/workout-entry';
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
  const [notices, setNotices] = useState<Record<string, string>>({});
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

  // Adds or removes a planned set; the server carries the change over to the following weeks.
  function changeSets(item: WorkoutExercise, change: { op: 'add_set' } | { op: 'remove_set'; set_number: number }) {
    const key = `${item.id}:sets`;
    setPending((current) => new Set(current).add(key));
    setError(null);
    queue.current = queue.current.then(async () => {
      try {
        const result = await api.changeSets(item.id, change);
        setWorkout(result.workout);
        // Rows after a removed one move up: drop their unsaved drafts and errors.
        if (change.op === 'remove_set') {
          const stale = (k: string) => k.startsWith(`${item.id}:`) && Number(k.split(':')[1]) >= change.set_number;
          setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([k]) => !stale(k))));
          setErrors((current) => Object.fromEntries(Object.entries(current).filter(([k]) => !stale(k))));
        }
        const done = change.op === 'add_set' ? 'Set added' : `Set ${change.set_number} removed`;
        const count = result.workout.exercises.find((e) => e.id === item.id)?.target_sets ?? 0;
        setNotices((current) => ({
          ...current,
          [item.id]:
            result.carried_weeks.length > 0
              ? `${done}. ${weeksLabel(result.carried_weeks)} will also have ${count} ${count === 1 ? 'set' : 'sets'} of ${item.exercise.name}.`
              : `${done}. Only this workout changed (later weeks have started or this is the last one).`,
        }));
      } catch (e) {
        setError(`Could not change the sets: ${message(e, 'unknown error')}`);
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    });
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
      notices={notices}
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
      onAddSet={(item) => changeSets(item, { op: 'add_set' })}
      onRemoveSet={(item, row) => changeSets(item, { op: 'remove_set', set_number: row.setNumber })}
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
