'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '../../lib/api-client';
import { NewMesocycleForm } from './NewMesocycleForm';

export function NewMesocycleContainer() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold">New mesocycle</h1>
      <NewMesocycleForm
        submitting={submitting}
        error={error}
        onSubmit={async (values) => {
          setSubmitting(true);
          setError(null);
          try {
            const created = await api.createMesocycle(values);
            router.push(`/mesocycles/${created.id}/build`);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create the mesocycle');
            setSubmitting(false);
          }
        }}
      />
    </main>
  );
}
