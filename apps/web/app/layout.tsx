import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = { title: 'Mesocycle Builder', description: 'Hypertrophy mesocycle and schedule builder' };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/mesocycles" className="text-lg font-semibold">
              Mesocycle Builder
            </Link>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
