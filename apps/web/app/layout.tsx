import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = { title: 'Mesocycle Builder', description: 'Hypertrophy mesocycle and schedule builder' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen text-graphite-50 antialiased">
        <header className="border-b border-graphite-800/80 bg-graphite-950/70 backdrop-blur">
          <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
            <Link href="/mesocycles" className="flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden="true"
                className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-aqua-400 to-verdigris-600 text-sm font-black text-graphite-950"
              >
                M
              </span>
              <span>
                Mesocycle <span className="text-aqua-400">Builder</span>
              </span>
            </Link>
            <Link href="/mesocycles" className="text-sm text-graphite-300 hover:text-graphite-50">
              My blocks
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
