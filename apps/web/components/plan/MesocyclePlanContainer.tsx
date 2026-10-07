'use client';

import type { MesocycleDetail } from '@mesocycle/shared';
import type { Landmarks } from '@mesocycle/volume-engine';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, ApiClientError } from '../../lib/api-client';
import { detailToState } from '../../lib/builder/mappers';
import { computeReviewStats } from '../../lib/builder/review-stats';
import { computeBuilderBlockVolume, computeBuilderVolume, toEngineLandmarks } from '../../lib/builder/volume';
import { todayIso } from '../../lib/dates';
import { MesocyclePlan } from './MesocyclePlan';

type Loaded = { detail: MesocycleDetail; landmarks: Landmarks };

// Loads a mesocycle for the read-only view. Drafts belong in the builder, so they are redirected there.
export function MesocyclePlanContainer({ mesocycleId }: { mesocycleId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getMesocycle(mesocycleId), api.getLandmarks()])
      .then(([detail, landmarks]) => {
        if (cancelled) return;
        if (detail.status === 'draft') router.replace(`/mesocycles/${mesocycleId}/build`);
        else setLoaded({ detail, landmarks: toEngineLandmarks(landmarks) });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof ApiClientError && e.status === 404 ? 'Mesocycle not found.' : e instanceof Error ? e.message : 'Could not load the mesocycle.');
      });
    return () => {
      cancelled = true;
    };
  }, [mesocycleId, router]);

  const view = useMemo(() => {
    if (!loaded) return null;
    const state = detailToState(loaded.detail);
    return {
      stats: computeReviewStats(state),
      volume: computeBuilderVolume(state, loaded.landmarks),
      block: computeBuilderBlockVolume(state, loaded.detail.duration_weeks, loaded.detail.deload_final_week),
    };
  }, [loaded]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-4 text-snow-100">
          {error}
        </p>
        <Link href="/mesocycles" className="mt-4 inline-block text-aqua-300 underline">
          Back to mesocycles
        </Link>
      </main>
    );
  }
  if (!loaded || !view) return <p className="p-6 text-graphite-300">Loading…</p>;
  return <MesocyclePlan detail={loaded.detail} stats={view.stats} volume={view.volume} block={view.block} today={todayIso()} />;
}
