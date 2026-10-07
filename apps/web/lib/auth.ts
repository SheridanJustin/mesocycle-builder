import { SignInSchema } from '@mesocycle/shared';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { findOrCreateGoogleUser, verifyCredentials } from './accounts';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

// Google sign-in is offered only when its OAuth client is configured (AUTH_GOOGLE_ID/SECRET in .env).
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

// Auth.js with JWT sessions (an httpOnly, signed cookie). The token's `sub` is our users.id.
export const { handlers, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
      async authorize(raw) {
        const parsed = SignInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const user = await verifyCredentials(parsed.data.email, parsed.data.password);
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
    ...(googleEnabled ? [Google] : []),
  ],
  callbacks: {
    signIn({ account, profile }) {
      // Only verified Google emails may sign in (and be linked to an existing account).
      if (account?.provider === 'google') return profile?.email_verified === true;
      return true;
    },
    async jwt({ token, user, account, profile }) {
      if (account?.provider === 'google' && profile?.sub && profile.email) {
        const linked = await findOrCreateGoogleUser({
          sub: profile.sub,
          email: profile.email,
          emailVerified: profile.email_verified === true,
          name: typeof profile.name === 'string' ? profile.name : null,
        });
        token.sub = linked.id;
        token.name = linked.name;
        token.email = linked.email;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
