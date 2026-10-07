import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountMenu } from '../components/auth/AccountMenu';
import { auth } from '../lib/auth';
import './globals.css';

export const metadata: Metadata = { title: 'Mesocycle Builder', description: 'Hypertrophy mesocycle and schedule builder' };

// Full-height app shell: the page itself never scrolls; each screen fits the window.
export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  const user = session?.user;
  return (
    <html lang="en">
      <body className="flex h-dvh flex-col overflow-hidden text-graphite-50 antialiased">
        <header className="shrink-0 border-b border-graphite-800/80 bg-graphite-950/70 backdrop-blur">
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
            <div className="flex items-center gap-4">
              {user?.id ? (
                <>
                  <Link href="/mesocycles" className="text-sm text-graphite-300 hover:text-graphite-50">
                    My mesocycles
                  </Link>
                  <AccountMenu label={user.name ?? user.email ?? 'Account'} />
                </>
              ) : (
                <Link href="/login" className="rounded-lg border border-graphite-700 px-2.5 py-1 text-sm font-medium text-graphite-100 hover:bg-graphite-800">
                  Log in
                </Link>
              )}
            </div>
          </div>
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </body>
    </html>
  );
}
