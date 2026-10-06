'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { stepCompletion, type StepNumber } from '../../lib/builder/completion';
import { useBuilder } from '../../lib/builder/use-builder';
import { SaveIndicator } from '../ui/SaveIndicator';
import { ReviewPlaceholder } from './ReviewPlaceholder';
import { Stepper } from './Stepper';
import { StepMuscles } from './StepMuscles';
import { StepSchedule } from './StepSchedule';

export function BuilderPage({ mesocycleId }: { mesocycleId: string }) {
  const builder = useBuilder(mesocycleId);
  const [step, setStep] = useState<StepNumber>(1);
  const [reviewOpened, setReviewOpened] = useState(false);
  const { load, meta, state, volume, actions } = builder;

  const completion = useMemo(
    () => stepCompletion(state, meta?.scheduleMode ?? 'relative', volume, reviewOpened),
    [state, meta?.scheduleMode, volume, reviewOpened],
  );

  function select(next: StepNumber) {
    setStep(next);
    if (next === 6) setReviewOpened(true);
  }

  if (load.kind === 'loading') return <p className="p-6 text-slate-600">Loading…</p>;
  if (load.kind === 'error' || !meta) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p role="alert" className="rounded-md bg-red-50 p-4 text-red-900">
          {load.kind === 'error' ? load.message : 'Could not load the mesocycle.'}
        </p>
        <Link href="/mesocycles" className="mt-4 inline-block text-blue-800 underline">
          Back to mesocycles
        </Link>
      </main>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="truncate text-lg font-semibold" data-testid="mesocycle-title">
              {meta.name}
            </h1>
            <SaveIndicator status={builder.saveStatus} onRetry={builder.retrySave} />
          </div>
          <Stepper current={step} completion={completion} onSelect={select} />
        </div>
      </div>

      {builder.notice && (
        <p role="alert" className="mx-auto mt-3 max-w-3xl rounded-md bg-red-50 p-3 text-sm text-red-900">
          {builder.notice}
        </p>
      )}

      {step === 1 && (
        <StepSchedule
          settings={{ name: meta.name, durationWeeks: meta.durationWeeks, deloadFinalWeek: meta.deloadFinalWeek }}
          mode={meta.scheduleMode}
          days={state.days}
          onSettingsChange={(patch) => void builder.updateSettings(patch)}
          onRenameDay={actions.renameDay}
          onSetWeekday={actions.setWeekday}
          onAddDay={actions.addDay}
          onRemoveDay={actions.removeDay}
        />
      )}
      {step === 2 && (
        <StepMuscles
          days={state.days}
          priorities={state.priorities}
          onAddMuscle={actions.addMuscle}
          onRemoveMuscle={actions.removeMuscle}
          onSetPriority={actions.setPriority}
        />
      )}
      {(step === 3 || step === 4 || step === 5) && (
        <p className="p-6 text-slate-600">The board arrives in the next milestone.</p>
      )}
      {step === 6 && <ReviewPlaceholder />}
    </div>
  );
}
