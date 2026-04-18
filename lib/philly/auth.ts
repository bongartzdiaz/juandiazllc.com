/* ---------------------------------------------------------------
   NextAuth v4 configuration — Philly Dashboard
   - Prisma adapter against the MariaDB database
   - Credentials provider (email + password) backed by User.passwordHash
   - JWT session strategy (Credentials provider does not support db sessions)
   - Brute-force lockout (5 bad tries → 15-min lock)
   - Global session revocation via tokensInvalidAfter
   --------------------------------------------------------------- */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import bcrypt from 'bcryptjs'
import { logger } from '@/lib/philly/logger'
import { decryptSecret } from '@/lib/philly/crypto'

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

/* ---- Brute-force lockout policy ---- */
const MAX_FAILED_LOGINS = 5
const LOCKOUT_MINUTES = 15

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
          twoFactorCode: { label: '2FA code', type: 'text' },
        },
        async authorize(credentials, req) {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const prisma = getAuthPrisma()
          const email = credentials.email.toLowerCase().trim()
          const ip =
            (req?.headers?.['x-forwarded-for'] as string | undefined)
              ?.split(',')[0]
              ?.trim() ?? 'unknown'

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              passwordHash: true,
              role: true,
              organizationId: true,
              avatarUrl: true,
              failedLoginCount: true,
              lockedUntil: true,
              twoFactorEnabled: true,
              twoFactorSecret: true,
            },
          })

          // Generic "bad credentials" response even for unknown users — don't
          // leak which emails exist in the DB. A small artificial delay also
          // smooths the timing difference between known/unknown emails.
          if (!user) {
            await bcrypt.compare(credentials.password, '$2a$10$invalidinvalidinvalidinvalidinvalidinva')
            logger.warn('login: unknown email', { email, ip })
            return null
          }

          // Locked?
          if (user.lockedUntil && user.lockedUntil > new Date()) {
            logger.warn('login: account locked', {
              userId: user.id,
              email,
              ip,
              lockedUntil: user.lockedUntil.toISOString(),
            })
            return null
          }

          const valid = await bcrypt.compare(credentials.password, user.passwordHash)

          if (!valid) {
            const attempts = (user.failedLoginCount ?? 0) + 1
            const shouldLock = attempts >= MAX_FAILED_LOGINS
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginCount: attempts,
                lockedUntil: shouldLock
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                  : undefined,
              },
            })
            logger.warn('login: bad password', {
              userId: user.id,
              email,
              ip,
              attempts,
              locked: shouldLock,
            })
            return null
          }

          // 2FA gate — if enabled, require a valid TOTP or recovery code.
          // We don't want to leak that 2FA is enabled for a given email, but
          // since the password already verified here, the caller has already
          // proven account knowledge, so returning a specific "2FA required"
          // is acceptable — however NextAuth's Credentials flow only surfaces
          // null/user, so we just reject and the client re-prompts with code.
          if (user.twoFactorEnabled) {
            const code = (credentials.twoFactorCode ?? '').trim()
            if (!code) {
              logger.warn('login: 2FA code required', { userId: user.id, email, ip })
              // Signal to the client via a thrown error so the UI can prompt
              // for the code. NextAuth surfaces the message as ?error=...
              throw new Error('2FA_REQUIRED')
            }

            let twoFactorOk = false
            if (/^\d{6}$/.test(code)) {
              if (user.twoFactorSecret) {
                try {
                  const secret = decryptSecret(user.twoFactorSecret)
                  if (secret) {
                    // Lazy import to keep the auth module lightweight at build time
                    const { verifyTotp } = await import('@/lib/two-factor')
                    twoFactorOk = verifyTotp(code, secret)
                  }
                } catch {
                  /* fall through to failure */
                }
              }
            } else {
              // Recovery code path — lazy import to avoid a cycle with two-factor.ts
              const { consumeRecoveryCode } = await import('@/lib/two-factor')
              twoFactorOk = await consumeRecoveryCode(user.id, code)
            }

            if (!twoFactorOk) {
              const attempts = (user.failedLoginCount ?? 0) + 1
              const shouldLock = attempts >= MAX_FAILED_LOGINS
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  failedLoginCount: attempts,
                  lockedUntil: shouldLock
                    ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                    : undefined,
                },
              })
              logger.warn('login: bad 2FA code', {
                userId: user.id,
                email,
                ip,
                attempts,
                locked: shouldLock,
              })
              throw new Error('2FA_INVALID')
            }

            logger.info('login: 2FA ok', { userId: user.id, email, ip })
          }

          // Success — reset counters, record login
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: 0,
              lockedUntil: null,
              lastLoginAt: new Date(),
              lastLoginIp: ip,
            },
          })

          logger.info('login: ok', { userId: user.id, email, ip })

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
          // Stamp issue-time so we can revoke all pre-existing tokens
          token.iat = Math.floor(Date.now() / 1000)
        }
        return token
      },
      async session({ session, token }) {
        // Enforce global session revocation: if the user has
        // tokensInvalidAfter set, reject tokens issued before it.
        const tokenIat = typeof token.iat === 'number' ? token.iat : 0
        const userId = token.id as string | undefined

        if (userId && tokenIat > 0) {
          try {
            const prisma = getAuthPrisma()
            const fresh = await prisma.user.findUnique({
              where: { id: userId },
              select: { tokensInvalidAfter: true, role: true, organizationId: true },
            })
            if (fresh?.tokensInvalidAfter) {
              const cutoff = Math.floor(fresh.tokensInvalidAfter.getTime() / 1000)
              if (tokenIat < cutoff) {
                // Token predates revocation — return an expired session so
                // downstream code treats this as logged-out.
                return { ...session, expires: new Date(0).toISOString() }
              }
            }
            // Refresh role / org in case they changed since login
            if (session.user && fresh) {
              session.user.role = fresh.role
              session.user.organizationId = fresh.organizationId
            }
          } catch {
            /* if DB is down, fall through to the stale token data */
          }
        }

        if (session.user) {
          session.user.id = token.id as string
          session.user.role = session.user.role ?? (token.role as string | undefined)
          session.user.organizationId =
            session.user.organizationId ?? (token.organizationId as string | undefined)
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
