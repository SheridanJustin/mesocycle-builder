'use client';

import type { MesocycleSummary } from '@mesocycle/shared';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MesocycleList } from './MesocycleList';

export function MesocycleListContainer() {
  const [items, setItems] = useState<MesocycleSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Mesocycles</h1>
        <Link href="/mesocycles/new" className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800">
          New mesocycle
        </Link>
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-900">
          {error}
        </p>
      )}
      {items === null && !error && <p className="text-slate-600">Loading…</p>}
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
