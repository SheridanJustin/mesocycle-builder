'use client';

import { type Exercise, type LockMesocycle, type MesocycleTemplate } from '@mesocycle/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiClientError } from '../../lib/api-client';
import { computeReviewStats } from '../../lib/builder/review-stats';
import { useBuilder } from '../../lib/builder/use-builder';
import { computeBuilderBlockVolume, contributionsFor } from '../../lib/builder/volume';
import { AddExercisesPanel } from '../board/AddExercisesPanel';
import { Board } from '../board/Board';
import type { BoardHandlers } from '../board/types';
import { TemplatePicker } from '../templates/TemplatePicker';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { InlineText } from '../ui/InlineText';
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
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<MesocycleTemplate | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const router = useRouter();

  // A locked mesocycle is read-only: show its plan instead of the builder (SPEC 9.4).
  const status = meta?.status;
  useEffect(() => {
    if (status && status !== 'draft') router.replace(`/mesocycles/${mesocycleId}`);
  }, [status, mesocycleId, router]);

  async function lockIn(body: LockMesocycle) {
    setLocking(true);
    setLockError(null);
    try {
      await builder.lockIn(body);
      router.replace(`/mesocycles/${mesocycleId}`);
    } catch (error) {
      const details = error instanceof ApiClientError ? error.details.map((d) => d.issue).join('; ') : '';
      setLockError(error instanceof Error ? `${error.message}${details ? ` (${details})` : ''}` : 'Could not lock in.');
      setLocking(false);
    }
  }

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
    onMoveDay: actions.moveDay,
    onRemoveSlot: actions.removeSlot,
    onOpenTemplates: () => {
      setTemplateError(null);
      setPickingTemplate(true);
    },
  };

  async function applyTemplate(template: MesocycleTemplate) {
    setPendingTemplate(null);
    setApplyingId(template.id);
    setTemplateError(null);
    try {
      await builder.applyTemplate(template);
      setPickingTemplate(false);
    } catch (error) {
      setTemplateError(error instanceof Error ? `Could not load the template: ${error.message}` : 'Could not load the template.');
    } finally {
      setApplyingId(null);
    }
  }
  const hasExercises = state.days.some((day) => day.slots.length > 0);

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

  const stats = computeReviewStats(state);
  const trainingDays = stats.trainingDays;
  const cycleLabel = state.mode === 'calendar' ? 'Mon–Sun week' : `${state.days.length}-day cycle`;

  return (
    <div className="flex h-full flex-col">
      <div className="relative z-30 shrink-0 border-b border-graphite-800/80 bg-graphite-950/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 pt-2.5">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="min-w-0">
              <h1 className="-ml-2 text-lg font-semibold tracking-tight">
                <InlineText
                  ariaLabel="Mesocycle name"
                  value={meta.name}
                  maxLength={255}
                  onCommit={(name) => void builder.updateSettings({ name })}
                  className="w-[min(28rem,70vw)] py-0.5"
                  testId="mesocycle-title"
                />
              </h1>
              <p className="text-xs text-graphite-400">
                {meta.durationWeeks} weeks · {cycleLabel} · {trainingDays.length} training day{trainingDays.length === 1 ? '' : 's'}
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

      <div className="min-h-0 flex-1">
        {tab === 'build' ? (
          <Board state={state} handlers={handlers} focusDayId={focusDayId} onFocusHandled={clearFocus} />
        ) : (
          <ReviewTab
            settings={{ durationWeeks: meta.durationWeeks, deloadFinalWeek: meta.deloadFinalWeek }}
            stats={stats}
            volume={volume}
            block={block}
            onSettingsChange={(patch) => void builder.updateSettings(patch)}
            mode={state.mode}
            lock={{ busy: locking, error: lockError, onConfirm: (body) => void lockIn(body), onOpen: () => setLockError(null) }}
          />
        )}
      </div>

      <TemplatePicker
        open={pickingTemplate}
        onClose={() => setPickingTemplate(false)}
        onPick={(template) => (hasExercises ? setPendingTemplate(template) : void applyTemplate(template))}
        note={hasExercises ? 'Picking a template replaces all of your current days and exercises.' : undefined}
        busyId={applyingId}
        error={templateError}
      />
      <ConfirmDialog
        open={pendingTemplate !== null}
        title="Replace your days?"
        message={`“${pendingTemplate?.name ?? ''}” will replace every day and exercise on your board.`}
        confirmLabel="Use template"
        onConfirm={() => pendingTemplate && void applyTemplate(pendingTemplate)}
        onCancel={() => setPendingTemplate(null)}
      />
      <AddExercisesPanel dayName={addingToDay?.name ?? null} onAdd={addExercises} onClose={() => setAddingToDayId(null)} />
    </div>
  );
}
