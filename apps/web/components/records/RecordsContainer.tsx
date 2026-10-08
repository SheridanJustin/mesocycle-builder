'use client';

import type { Records } from '@mesocycle/shared';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api-client';
import { RecordsView } from './RecordsView';

export function RecordsContainer() {
  const [records, setRecords] = useState<Records | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getRecords()
      .then((value) => !cancelled && setRecords(value))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load your personal bests.'));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <p role="alert" className="rounded-md border border-snow-700 bg-snow-900 p-4 text-snow-100">
          {error}
        </p>
      </main>
    );
  }
  if (!records) return <p className="p-6 text-graphite-300">Loading…</p>;
  return <RecordsView records={records} />;
}
