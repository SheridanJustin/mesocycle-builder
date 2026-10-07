import Link from 'next/link';

// Unknown URLs (and pages that call notFound()).
export default function NotFound() {
  return (
    <main className="grid h-full place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-aqua-300">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-sm text-graphite-400">The page you asked for does not exist or has moved.</p>
        <Link href="/mesocycles" className="mt-5 inline-block rounded-lg bg-aqua-500 px-4 py-2 text-sm font-medium text-graphite-950 hover:bg-aqua-400">
          Go to my mesocycles
        </Link>
      </div>
    </main>
  );
}
