/* ---------------------------------------------------------------
   Philly Prisma client (MariaDB via @prisma/adapter-mariadb).

   Auth itself lives in Supabase — see lib/philly/auth-helpers.ts
   for the session + requireScope() helpers. This module just
   exposes the lazily-built Prisma singleton that auth-helpers and
   audit logging use to look up / provision Philly user rows.
   --------------------------------------------------------------- */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const globalForPrisma = globalThis as unknown as { authPrisma?: PrismaClient }

/**
 * Lazy Prisma singleton (server-only). The client is built on first
 * use, never at module load, so `next build` works without DATABASE_URL
 * (e.g. CI image build) and only fails on first real request.
 */
export function getAuthPrisma(): PrismaClient {
  if (globalForPrisma.authPrisma) return globalForPrisma.authPrisma

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — Philly DB requires it')
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL)
  const client = new PrismaClient({ adapter })

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.authPrisma = client
  }
  return client
}
