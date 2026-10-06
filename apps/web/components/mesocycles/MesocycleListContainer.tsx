'use client';

import type { MesocycleSummary } from '@mesocycle/shared';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MesocycleList } from './MesocycleList';

export function MesocycleListContainer() {
  const router = useRouter();
  const [items, setItems] = useState<MesocycleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MesocycleSummary | null>(null);

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

  // No form: a new block starts as an untitled 4-week Mon-Sun draft; name and duration live on Review.
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
          <p className="text-sm text-graphite-400">Plan a 4–6 week hypertrophy block, one week at a time.</p>
        </div>
        <Button variant="primary" onClick={() => void createNew()} disabled={creating}>
          {creating ? 'Creating…' : 'New mesocycle'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-md border border-snow-700 bg-snow-900 p-3 text-sm text-snow-100">
          {error}
        </p>
      )}
      {items === null && !error && <p className="text-graphite-400">Loading…</p>}
      {items && <MesocycleList items={items} onDelete={setPendingDelete} />}
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
