'use client';

import { estimateSessionMinutes, type Exercise } from '@mesocycle/shared';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useBuilder } from '../../lib/builder/use-builder';
import { computeBuilderBlockVolume, contributionsFor } from '../../lib/builder/volume';
import { AddExercisesPanel } from '../board/AddExercisesPanel';
import { Board } from '../board/Board';
import type { BoardHandlers } from '../board/types';
import { SaveIndicator } from '../ui/SaveIndicator';
import { VolumeBar } from '../volume/VolumeBar';
import { ReviewTab } from './ReviewTab';

type Tab = 'build' | 'review';
const TABS: { id: Tab; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'review', label: 'Review' },
];

export function BuilderPage({ mesocycleId }: { mesocycleId: string }) {
  const builder = useBuilder(mesocycleId);
  const [tab, setTab] = useState<Tab>('build');
  const [addingToDayId, setAddingToDayId] = useState<string | null>(null);
  const [focusDayId, setFocusDayId] = useState<string | null>(null);
  const { load, meta, state, volume, actions } = builder;
  const clearFocus = useCallback(() => setFocusDayId(null), []);

  const handlers: BoardHandlers = {
    onSetNumbered: actions.setNumbered,
    onAddDay: actions.addDay,
    onRemoveDay: actions.removeDay,
    onClearDay: actions.clearDay,
    onRenameDay: actions.renameDay,
    onCopyDay: (sourceDayId, targetDayId) => {
      const receivingDayId = builder.copyDay(sourceDayId, targetDayId);
      // A brand-new copy scrolls into view with its name ready to edit.
      if (targetDayId === null) setFocusDayId(receivingDayId);
    },
    onOpenAddExercises: setAddingToDayId,
    onUpdateSlot: actions.updateSlot,
    onMoveSlot: actions.moveSlot,
    onRemoveSlot: actions.removeSlot,
  };

  function addExercises(exercises: Exercise[]) {
    if (addingToDayId) actions.addExercises(addingToDayId, exercises);
    setAddingToDayId(null);
  }
  const addingToDay = state.days.find((d) => d.id === addingToDayId);

  const block = useMemo(
    () => (meta ? computeBuilderBlockVolume(state, meta.durationWeeks, meta.deloadFinalWeek) : {}),
    [state, meta],
  );

  if (load.kind === 'loading') return <p className="p-6 text-graphite-300">Loading…</p>;
  if (load.kind === 'error' || !meta) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-4 text-snow-100">
          {load.kind === 'error' ? load.message : 'Could not load the mesocycle.'}
        </p>
        <Link href="/mesocycles" className="mt-4 inline-block text-aqua-300 underline">
          Back to mesocycles
        </Link>
      </main>
    );
  }

  const training = state.days.filter((d) => d.slots.length > 0);
  const stats = {
    trainingDays: training.length,
    restDays: state.days.length - training.length,
    weeklySets: training.reduce((sum, day) => sum + day.slots.reduce((s, slot) => s + slot.sets, 0), 0),
    averageMinutes: training.length
      ? Math.round(
          training.reduce(
            (sum, day) => sum + estimateSessionMinutes(day.slots.map((slot) => ({ sets: slot.sets, movementType: slot.exercise.movement_type }))),
            0,
          ) /
            training.length /
            5,
        ) * 5
      : 0,
  };
  const cycleLabel = state.mode === 'calendar' ? 'Mon–Sun week' : `${state.days.length}-day cycle`;

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-graphite-800/80 bg-graphite-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 pt-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight" data-testid="mesocycle-title">
                {meta.name}
              </h1>
              <p className="text-xs text-graphite-400">
                {meta.durationWeeks} weeks · {cycleLabel} · {stats.trainingDays} training day{stats.trainingDays === 1 ? '' : 's'}
                {meta.deloadFinalWeek ? ' · deload' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SaveIndicator status={builder.saveStatus} onRetry={builder.retrySave} />
              <nav aria-label="Builder tabs" className="flex rounded-xl border border-graphite-800 bg-graphite-900 p-0.5">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-current={tab === t.id ? 'page' : undefined}
                    onClick={() => setTab(t.id)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                      tab === t.id ? 'bg-aqua-500 text-graphite-950 shadow' : 'text-graphite-300 hover:text-graphite-50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
          <VolumeBar volume={volume} contributionsFor={(group) => contributionsFor(state, group)} />
        </div>
      </div>

      {builder.notice && (
        <p role="alert" className="mx-auto mt-3 max-w-3xl rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
          {builder.notice}
        </p>
      )}

      {tab === 'build' ? (
        <Board state={state} weightUnit="lb" handlers={handlers} focusDayId={focusDayId} onFocusHandled={clearFocus} />
      ) : (
        <ReviewTab
          settings={{ name: meta.name, durationWeeks: meta.durationWeeks, deloadFinalWeek: meta.deloadFinalWeek }}
          stats={stats}
          volume={volume}
          block={block}
          onSettingsChange={(patch) => void builder.updateSettings(patch)}
        />
      )}

      <AddExercisesPanel dayName={addingToDay?.name ?? null} onAdd={addExercises} onClose={() => setAddingToDayId(null)} />
    </div>
  );
}
