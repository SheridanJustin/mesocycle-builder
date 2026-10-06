import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = { title: 'Mesocycle Builder', description: 'Hypertrophy mesocycle and schedule builder' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-graphite-950 text-graphite-50 antialiased">
        <header className="border-b border-graphite-800 bg-graphite-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/mesocycles" className="text-lg font-semibold tracking-tight">
              Mesocycle <span className="text-aqua-400">Builder</span>
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
