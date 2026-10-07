'use client';

import {
  DEFAULT_MESOCYCLE_NAME,
  PutScheduleSchema,
  type Exercise,
  type LockMesocycle,
  type MesocycleDetail,
  type MesocycleTemplate,
} from '@mesocycle/shared';
import type { Landmarks } from '@mesocycle/volume-engine';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { api, ApiClientError, fetchExerciseCatalog } from '../api-client';
import { AutosaveController, type SaveStatus } from './autosave';
import { newId } from './ids';
import { detailToState, stateToSchedule } from './mappers';
import { builderReducer, EMPTY_STATE, type BuilderAction } from './reducer';
import { templateToState } from './templates';
import type { BuilderState, SlotMetrics } from './types';
import { computeBuilderVolume, toEngineLandmarks } from './volume';

export type BuilderMeta = {
  name: string;
  durationWeeks: number;
  deloadFinalWeek: boolean;
  status: MesocycleDetail['status'];
};

export type BuilderLoad = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function metaFrom(detail: MesocycleDetail): BuilderMeta {
  return {
    name: detail.name,
    durationWeeks: detail.duration_weeks,
    deloadFinalWeek: detail.deload_final_week,
    status: detail.status,
  };
}

function validationMessage(state: BuilderState): string | null {
  const result = PutScheduleSchema.safeParse(stateToSchedule(state));
  if (result.success) return null;
  const issue = result.error.issues[0];
  return issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid schedule';
}

export function useBuilder(mesocycleId: string) {
  const [load, setLoad] = useState<BuilderLoad>({ kind: 'loading' });
  const [meta, setMeta] = useState<BuilderMeta | null>(null);
  const [landmarks, setLandmarks] = useState<Landmarks | null>(null);
  const [state, rawDispatch] = useReducer(builderReducer, EMPTY_STATE);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [notice, setNotice] = useState<string | null>(null);

  const controller = useRef<AutosaveController<BuilderState> | null>(null);
  const lastDetail = useRef<MesocycleDetail | null>(null);
  const saveRequested = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const autosave = new AutosaveController<BuilderState>({
      save: async (value) => {
        lastDetail.current = await api.putSchedule(mesocycleId, stateToSchedule(value));
      },
      validate: validationMessage,
      isRetryable: (error) => !(error instanceof ApiClientError) || error.retryable,
      onStatus: (status) => {
        if (!cancelled) setSaveStatus(status);
      },
    });
    controller.current = autosave;

    Promise.all([api.getMesocycle(mesocycleId), api.getLandmarks()])
      .then(([detail, landmarkList]) => {
        if (cancelled) return;
        lastDetail.current = detail;
        setMeta(metaFrom(detail));
        setLandmarks(toEngineLandmarks(landmarkList));
        rawDispatch({ type: 'hydrate', state: detailToState(detail) });
        setLoad({ kind: 'ready' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof ApiClientError && error.status === 404 ? 'Mesocycle not found.' : error instanceof Error ? error.message : 'Could not load the mesocycle.';
        setLoad({ kind: 'error', message });
      });

    return () => {
      cancelled = true;
      autosave.dispose();
      controller.current = null;
    };
  }, [mesocycleId]);

  // Schedule a save after every user edit (not after hydration).
  useEffect(() => {
    if (!saveRequested.current) return;
    saveRequested.current = false;
    controller.current?.schedule(state);
  }, [state]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (controller.current?.hasUnsavedChanges) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const dispatch = useCallback((action: BuilderAction) => {
    saveRequested.current = action.type !== 'hydrate';
    rawDispatch(action);
  }, []);

  const volume = useMemo(() => (landmarks ? computeBuilderVolume(state, landmarks) : { summary: {} }), [state, landmarks]);

  const actions = useMemo(
    () => ({
      setNumbered: (numbered: boolean) => dispatch({ type: 'setNumbered', numbered }),
      addDay: () => dispatch({ type: 'addDay', dayId: newId() }),
      removeDay: (dayId: string) => dispatch({ type: 'removeDay', dayId }),
      clearDay: (dayId: string) => dispatch({ type: 'clearDay', dayId }),
      renameDay: (dayId: string, name: string) => dispatch({ type: 'renameDay', dayId, name }),
      addExercises: (dayId: string, exercises: Exercise[]) =>
        dispatch({ type: 'addSlots', dayId, items: exercises.map((exercise) => ({ slotId: newId(), exercise })) }),
      removeSlot: (slotId: string) => dispatch({ type: 'removeSlot', slotId }),
      updateSlot: (slotId: string, patch: Partial<SlotMetrics>) => dispatch({ type: 'updateSlot', slotId, patch }),
      moveSlot: (slotId: string, toDayId: string, beforeSlotId: string | null) =>
        dispatch({ type: 'moveSlot', slotId, toDayId, beforeSlotId }),
      moveDay: (dayId: string, toIndex: number) => dispatch({ type: 'moveDay', dayId, toIndex }),
    }),
    [dispatch],
  );

  // Copies a day's exercises into another day, or into a new day right after it (targetDayId null).
  // Returns the id of the day that received the copy.
  const copyDay = useCallback(
    (sourceDayId: string, targetDayId: string | null): string => {
      const source = state.days.find((d) => d.id === sourceDayId);
      const newDayId = newId();
      dispatch({ type: 'copyDay', sourceDayId, targetDayId, newDayId, slotIds: (source?.slots ?? []).map(() => newId()) });
      return targetDayId ?? newDayId;
    },
    [dispatch, state.days],
  );

  // Settings saves run one after another, so quick changes (3 weeks, then 6) reach the server in
  // order; only the response to the last pending save updates the screen.
  const settingsQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingSettings = useRef(0);
  const updateSettings = useCallback(
    (patch: Partial<Pick<BuilderMeta, 'name' | 'durationWeeks' | 'deloadFinalWeek'>>): Promise<void> => {
      setNotice(null);
      setMeta((current) => (current ? { ...current, ...patch } : current));
      pendingSettings.current += 1;
      const run = settingsQueue.current.then(async () => {
        try {
          const detail = await api.patchMesocycle(mesocycleId, {
            ...(patch.name !== undefined ? { name: patch.name } : {}),
            ...(patch.durationWeeks !== undefined ? { duration_weeks: patch.durationWeeks } : {}),
            ...(patch.deloadFinalWeek !== undefined ? { deload_final_week: patch.deloadFinalWeek } : {}),
          });
          if (pendingSettings.current === 1) setMeta(metaFrom(detail));
        } catch (error) {
          setNotice(error instanceof Error ? `Could not save settings: ${error.message}` : 'Could not save settings.');
          if (lastDetail.current) setMeta(metaFrom(lastDetail.current));
        } finally {
          pendingSettings.current -= 1;
        }
      });
      settingsQueue.current = run;
      return run;
    },
    [mesocycleId],
  );

  // Replaces every day with the template's. An untitled mesocycle also takes the template's name.
  const applyTemplate = useCallback(
    async (template: MesocycleTemplate) => {
      setNotice(null);
      const { state: next, missing } = templateToState(template, await fetchExerciseCatalog());
      dispatch({ type: 'replace', state: next });
      if (missing.length > 0) setNotice(`Some template exercises are not in your catalog and were skipped: ${missing.join(', ')}.`);
      if (meta?.name === DEFAULT_MESOCYCLE_NAME) await updateSettings({ name: template.name });
    },
    [dispatch, meta?.name, updateSettings],
  );

  // Saves any pending edits first, so the plan that gets locked is exactly what is on screen.
  const lockIn = useCallback(
    async (body: LockMesocycle): Promise<MesocycleDetail> => {
      const saved = (await controller.current?.flush()) ?? true;
      if (!saved) throw new Error('Your latest changes could not be saved. Retry saving, then lock in.');
      return api.lockMesocycle(mesocycleId, body);
    },
    [mesocycleId],
  );

  return {
    load,
    meta,
    state,
    volume,
    saveStatus,
    notice,
    actions,
    updateSettings,
    copyDay,
    applyTemplate,
    lockIn,
    retrySave: () => controller.current?.retry(),
  };
}
