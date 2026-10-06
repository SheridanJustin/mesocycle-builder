'use client';

import { PutScheduleSchema, type Exercise, type MesocycleDetail, type Muscle, type Priority, type ScheduleMode } from '@mesocycle/shared';
import type { Landmarks } from '@mesocycle/volume-engine';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { api, ApiClientError } from '../api-client';
import { AutosaveController, type SaveStatus } from './autosave';
import { newId } from './ids';
import { detailToState, stateToSchedule } from './mappers';
import { builderReducer, EMPTY_STATE, type BuilderAction } from './reducer';
import type { BuilderState, SlotMetrics } from './types';
import { computeBuilderVolume, toEngineLandmarks } from './volume';

export type BuilderMeta = {
  name: string;
  durationWeeks: number;
  deloadFinalWeek: boolean;
  scheduleMode: ScheduleMode;
  status: MesocycleDetail['status'];
};

export type BuilderLoad = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready' };

function metaFrom(detail: MesocycleDetail): BuilderMeta {
  return {
    name: detail.name,
    durationWeeks: detail.duration_weeks,
    deloadFinalWeek: detail.deload_final_week,
    scheduleMode: detail.schedule_mode,
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
      addDay: () => dispatch({ type: 'addDay', dayId: newId() }),
      removeDay: (dayId: string) => dispatch({ type: 'removeDay', dayId }),
      renameDay: (dayId: string, name: string) => dispatch({ type: 'renameDay', dayId, name }),
      setWeekday: (dayId: string, weekday: number | null) => dispatch({ type: 'setWeekday', dayId, weekday }),
      addMuscle: (dayId: string, muscle: Muscle) => dispatch({ type: 'addMuscle', dayId, muscle }),
      removeMuscle: (dayId: string, muscle: Muscle) => dispatch({ type: 'removeMuscle', dayId, muscle }),
      addSlot: (dayId: string, muscle: Muscle, exercise: Exercise) =>
        dispatch({ type: 'addSlot', dayId, muscle, exercise, slotId: newId() }),
      removeSlot: (slotId: string) => dispatch({ type: 'removeSlot', slotId }),
      updateSlot: (slotId: string, patch: Partial<SlotMetrics>) => dispatch({ type: 'updateSlot', slotId, patch }),
      stepSlot: (slotId: string, direction: 'up' | 'down') => dispatch({ type: 'stepSlot', slotId, direction }),
      moveSlot: (slotId: string, toDayId: string, toMuscle: Muscle, beforeSlotId: string | null) =>
        dispatch({ type: 'moveSlot', slotId, toDayId, toMuscle, beforeSlotId }),
      setPriority: (muscle: Muscle, priority: Priority) => dispatch({ type: 'setPriority', muscle, priority }),
    }),
    [dispatch],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Pick<BuilderMeta, 'name' | 'durationWeeks' | 'deloadFinalWeek'>>) => {
      setNotice(null);
      setMeta((current) => (current ? { ...current, ...patch } : current));
      try {
        const detail = await api.patchMesocycle(mesocycleId, {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.durationWeeks !== undefined ? { duration_weeks: patch.durationWeeks } : {}),
          ...(patch.deloadFinalWeek !== undefined ? { deload_final_week: patch.deloadFinalWeek } : {}),
        });
        setMeta(metaFrom(detail));
      } catch (error) {
        setNotice(error instanceof Error ? `Could not save settings: ${error.message}` : 'Could not save settings.');
        if (lastDetail.current) setMeta(metaFrom(lastDetail.current));
      }
    },
    [mesocycleId],
  );

  // Duplicate-day works on server ids, so unsaved edits are flushed first and the board is
  // rebuilt from the server's answer afterwards (the copy appears right of its source).
  const duplicateDay = useCallback(
    async (dayId: string): Promise<string | null> => {
      setNotice(null);
      const sourceIndex = state.days.findIndex((d) => d.id === dayId);
      const saved = await controller.current?.flush();
      const serverDay = lastDetail.current?.days[sourceIndex];
      if (!saved || sourceIndex === -1 || !serverDay) {
        setNotice('Could not duplicate the day because the latest changes are not saved yet.');
        return null;
      }
      try {
        const detail = await api.duplicateDay(mesocycleId, { source_day_id: serverDay.id, target_position: sourceIndex + 2 });
        lastDetail.current = detail;
        const next = detailToState(detail);
        saveRequested.current = false;
        rawDispatch({ type: 'hydrate', state: next });
        return next.days[sourceIndex + 1]?.id ?? null;
      } catch (error) {
        setNotice(error instanceof Error ? `Could not duplicate the day: ${error.message}` : 'Could not duplicate the day.');
        return null;
      }
    },
    [mesocycleId, state.days],
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
    duplicateDay,
    retrySave: () => controller.current?.retry(),
  };
}
