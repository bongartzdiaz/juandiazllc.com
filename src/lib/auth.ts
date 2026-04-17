/* ---------------------------------------------------------------
   NextAuth v4 configuration — Philly Dashboard
   - Prisma adapter against the MariaDB database
   - Credentials provider (email + password) backed by User.passwordHash
   - JWT session strategy (Credentials provider does not support db sessions)
   --------------------------------------------------------------- */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'

/* ---- Lazy Prisma singleton (server-only) ----
   The client is built on first use, never at module load time.
   This keeps `next build` working when DATABASE_URL is not set
   (e.g. CI image build), and only fails on first real auth request. */

const globalForPrisma = globalThis as unknown as { authPrisma?: PrismaClient }

export function getAuthPrisma(): PrismaClient {
  if (globalForPrisma.authPrisma) return globalForPrisma.authPrisma

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — auth requires a database')
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
  const client = new PrismaClient({ adapter })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.authPrisma = client
  }
  return client
}

/* ---- NextAuth options ----
   Exported as a function so the PrismaAdapter (and thus the database
   connection) is only constructed when NextAuth handles a real request,
   never at build time. */

export function getAuthOptions(): NextAuthOptions {
  return {
    adapter: PrismaAdapter(getAuthPrisma()),
    pages: {
      signIn: '/login',
    },
    providers: [
      CredentialsProvider({
        name: 'Credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Password', type: 'password' },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const prisma = getAuthPrisma()
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              role: true,
              organizationId: true,
              avatarUrl: true,
            },
          })

          if (!user) return null

          const valid = await bcrypt.compare(credentials.password, user.passwordHash)
          if (!valid) return null

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.avatarUrl ?? undefined,
            role: user.role,
            organizationId: user.organizationId,
          }
        },
      }),
    ],
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id
          token.role = (user as { role?: string }).role
          token.organizationId = (user as { organizationId?: string }).organizationId
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string
          session.user.role = token.role as string | undefined
          session.user.organizationId = token.organizationId as string | undefined
        }
        return session
      },
    },
    secret: process.env.NEXTAUTH_SECRET,
    // Never spam logs in production
    debug: process.env.NODE_ENV !== 'production',
    // 30-day rolling session; token is refreshed on activity
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
    // Force secure cookies when NEXTAUTH_URL is https — this works behind
    // a reverse proxy as long as the proxy sets X-Forwarded-Proto: https
    // (or NEXTAUTH_URL itself is https://).
    useSecureCookies: (process.env.NEXTAUTH_URL ?? '').startsWith('https://'),
  }
}
