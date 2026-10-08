'use client';

import type { MesocycleDetail, UpdateSession } from '@mesocycle/shared';
import type { Landmarks } from '@mesocycle/volume-engine';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiClientError } from '../../lib/api-client';
import { detailToState } from '../../lib/builder/mappers';
import { computeReviewStats } from '../../lib/builder/review-stats';
import { computeBuilderBlockVolume, computeBuilderVolume, toEngineLandmarks } from '../../lib/builder/volume';
import { todayIso } from '../../lib/dates';
import { downloadWeekPng } from '../../lib/export/week-png';
import { usePreferences } from '../preferences/PreferencesContext';
import { MesocyclePlan } from './MesocyclePlan';

type Loaded = { detail: MesocycleDetail; landmarks: Landmarks };

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

// Loads a locked mesocycle and saves workout progress. Drafts belong in the builder, so they are redirected there.
export function MesocyclePlanContainer({ mesocycleId }: { mesocycleId: string }) {
  const router = useRouter();
  const { showRir } = usePreferences();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  // Saves run one at a time, so each response (the whole mesocycle) includes every earlier change.
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getMesocycle(mesocycleId), api.getLandmarks()])
      .then(([detail, landmarks]) => {
        if (cancelled) return;
        if (detail.status === 'draft') router.replace(`/mesocycles/${mesocycleId}/build`);
        else setLoaded({ detail, landmarks: toEngineLandmarks(landmarks) });
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof ApiClientError && e.status === 404 ? 'Mesocycle not found.' : message(e, 'Could not load the mesocycle.'));
      });
    return () => {
      cancelled = true;
    };
  }, [mesocycleId, router]);

  const view = useMemo(() => {
    if (!loaded) return null;
    const state = detailToState(loaded.detail);
    return {
      state,
      stats: computeReviewStats(state),
      volume: computeBuilderVolume(state, loaded.landmarks),
      block: computeBuilderBlockVolume(state, loaded.detail.duration_weeks, loaded.detail.deload_final_week),
    };
  }, [loaded]);

  function setStatus(sessionId: string, status: UpdateSession['status']) {
    setPending((current) => new Set(current).add(sessionId));
    setActionError(null);
    queue.current = queue.current.then(async () => {
      try {
        const detail = await api.updateSession(sessionId, status);
        setLoaded((current) => (current ? { ...current, detail } : current));
      } catch (e) {
        setActionError(`Could not save the workout: ${message(e, 'unknown error')}`);
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(sessionId);
          return next;
        });
      }
    });
  }

  async function resume() {
    setActionError(null);
    try {
      const detail = await api.resumeMesocycle(mesocycleId);
      setLoaded((current) => (current ? { ...current, detail } : current));
    } catch (e) {
      setActionError(`Could not resume the mesocycle: ${message(e, 'unknown error')}`);
    }
  }

  async function extend(weeks: number): Promise<boolean> {
    setActionError(null);
    try {
      const detail = await api.extendMesocycle(mesocycleId, { weeks });
      setLoaded((current) => (current ? { ...current, detail } : current));
      return true;
    } catch (e) {
      setActionError(`Could not extend the mesocycle: ${message(e, 'unknown error')}`);
      return false;
    }
  }

  async function drop() {
    setActionError(null);
    try {
      const detail = await api.dropMesocycle(mesocycleId);
      setLoaded((current) => (current ? { ...current, detail } : current));
    } catch (e) {
      setActionError(`Could not drop the mesocycle: ${message(e, 'unknown error')}`);
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
  if (!loaded || !view) return <p className="p-6 text-graphite-300">Loading…</p>;
  return (
    <MesocyclePlan
      detail={loaded.detail}
      stats={view.stats}
      volume={view.volume}
      block={view.block}
      today={todayIso()}
      pendingSessionIds={pending}
      error={actionError}
      onSetStatus={setStatus}
      onDrop={() => void drop()}
      onResume={() => void resume()}
      onExtend={extend}
      onExport={() => void downloadWeekPng(view.state, loaded.detail.name, { showRir })}
    />
  );
}
