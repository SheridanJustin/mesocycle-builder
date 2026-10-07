'use client';

import Link from 'next/link';
import { useEffect } from 'react';

// Shown when a page crashes unexpectedly. "Try again" re-renders it; the header stays usable.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid h-full place-items-center p-6 text-center">
      <div role="alert">
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-graphite-400">Your saved work is safe. Try again, or go back to your mesocycles.</p>
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={reset} className="rounded-lg bg-aqua-500 px-4 py-2 text-sm font-medium text-graphite-950 hover:bg-aqua-400">
            Try again
          </button>
          <Link href="/mesocycles" className="rounded-lg border border-graphite-700 px-4 py-2 text-sm font-medium text-graphite-100 hover:bg-graphite-800">
            My mesocycles
          </Link>
        </div>
      </div>
    </main>
  );
}
