import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AccountMenu } from '../components/auth/AccountMenu';
import { PreferencesProvider } from '../components/preferences/PreferencesContext';
import { auth } from '../lib/auth';
import { prisma } from '../lib/db';
import { toAvatar, toPalette, toWeightUnit } from '../lib/me';
import { DEFAULT_PALETTE } from '@mesocycle/shared';
import './globals.css';

export const metadata: Metadata = { title: 'Mesocycle Builder', description: 'Hypertrophy mesocycle and schedule builder' };

// Full-height app shell: the page itself never scrolls; each screen fits the window.
export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  // The account row (not just the session) so the name and preferences are current.
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, showRir: true, weightUnit: true, palette: true, colorMode: true, avatarIcon: true, avatarColor: true },
      })
    : null;
  // Rendered on the server, so the page never flashes the default colors first.
  const appearance = {
    palette: toPalette(user?.palette ?? DEFAULT_PALETTE),
    colorMode: user?.colorMode === 'light' ? ('light' as const) : ('dark' as const),
  };
  return (
    <html lang="en" data-palette={appearance.palette} data-mode={appearance.colorMode}>
      <body className="flex h-dvh flex-col overflow-hidden text-graphite-50 antialiased">
        {/* Wraps the header too: the account menu changes the preferences the pages read. Keyed by
            user, so signing in as someone else starts from their saved preferences. */}
        <PreferencesProvider
          key={session?.user?.id ?? 'signed-out'}
          initialShowRir={user?.showRir ?? true}
          initialWeightUnit={toWeightUnit(user?.weightUnit ?? 'lb')}
          initialProfile={{ name: user?.name ?? null, avatar: toAvatar(user?.avatarIcon ?? '', user?.avatarColor ?? '') }}
          initialAppearance={appearance}
        >
          <header className="relative z-40 shrink-0 border-b border-graphite-800/80 bg-graphite-950/70 backdrop-blur">
            <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
              <Link href="/mesocycles" className="flex items-center gap-2 font-semibold tracking-tight">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-aqua-400 to-verdigris-600 text-sm font-black text-graphite-950"
                >
                  M
                </span>
                {/* The name is hidden on phones so the header links fit. */}
                <span className="hidden sm:inline">
                  Mesocycle <span className="text-aqua-400">Builder</span>
                </span>
                <span className="sr-only sm:hidden">Mesocycle Builder</span>
              </Link>
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <Link href="/mesocycles" className="text-sm text-graphite-300 hover:text-graphite-50">
                      My mesocycles
                    </Link>
                    <Link href="/records" className="text-sm text-graphite-300 hover:text-graphite-50">
                      Personal bests
                    </Link>
                    <AccountMenu email={user.email} />
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
        </PreferencesProvider>
      </body>
    </html>
  );
}
