'use client';

import type { MesocycleSummary, MesocycleTemplate } from '@mesocycle/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fetchExerciseCatalog } from '../../lib/api-client';
import { stateToSchedule } from '../../lib/builder/mappers';
import { templateToState } from '../../lib/builder/templates';
import { TemplatePicker } from '../templates/TemplatePicker';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MesocycleList } from './MesocycleList';

export function MesocycleListContainer() {
  const router = useRouter();
  const [items, setItems] = useState<MesocycleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MesocycleSummary | null>(null);
  const [pickingTemplate, setPickingTemplate] = useState(false);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems((await api.listMesocycles()).items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load mesocycles');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // A template creates a mesocycle named after it, fills in its days and opens the board.
  async function createFromTemplate(template: MesocycleTemplate) {
    setApplyingId(template.id);
    setTemplateError(null);
    try {
      const [created, catalog] = await Promise.all([api.createMesocycle({ name: template.name }), fetchExerciseCatalog()]);
      await api.putSchedule(created.id, stateToSchedule(templateToState(template, catalog).state));
      router.push(`/mesocycles/${created.id}/build`);
    } catch (e) {
      setTemplateError(e instanceof Error ? e.message : 'Could not create the mesocycle');
      setApplyingId(null);
    }
  }

  // No form: a new mesocycle starts as an untitled 4-week Mon-Sun draft; name and duration live on Review.
  async function createNew() {
    setCreating(true);
    setError(null);
    try {
      const created = await api.createMesocycle({});
      router.push(`/mesocycles/${created.id}/build`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the mesocycle');
      setCreating(false);
    }
  }

  // Optimistic: the list shows the new order at once. Saves run one after another so a slow
  // response can never undo a newer drag; on failure the saved order is reloaded.
  const saving = useRef<Promise<void>>(Promise.resolve());
  function reorder(ids: string[]) {
    setItems((current) => (current ? ids.flatMap((id) => current.filter((item) => item.id === id)) : current));
    saving.current = saving.current.then(async () => {
      try {
        await api.reorderMesocycles(ids);
      } catch (e) {
        setError(e instanceof Error ? `Could not save the new order: ${e.message}` : 'Could not save the new order');
        await load();
      }
    });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      await api.deleteMesocycle(pendingDelete.id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setPendingDelete(null);
      setError(e instanceof Error ? e.message : 'Could not delete the mesocycle');
    }
  }

  return (
    <main className="mx-auto h-full max-w-7xl overflow-y-auto px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mesocycles</h1>
          <p className="text-sm text-graphite-400">Plan a 3–10 week hypertrophy mesocycle, one week at a time. Drag a card by its ⠿ grip to reorder.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPickingTemplate(true)} disabled={creating}>
            Start from a template
          </Button>
          <Button variant="primary" onClick={() => void createNew()} disabled={creating}>
            {creating ? 'Creating…' : 'New mesocycle'}
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
          {error}
        </p>
      )}
      {items === null && !error && <p className="text-graphite-400">Loading…</p>}
      {items && <MesocycleList items={items} onDelete={setPendingDelete} onReorder={reorder} />}
      <TemplatePicker
        open={pickingTemplate}
        onClose={() => setPickingTemplate(false)}
        onPick={(template) => void createFromTemplate(template)}
        busyId={applyingId}
        error={templateError}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete mesocycle?"
        message={`“${pendingDelete?.name ?? ''}” and its schedule will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </main>
  );
}
