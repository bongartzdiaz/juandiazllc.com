// Prisma client singleton (Prisma 7 + MySQL driver adapter)
// Activated when DATABASE_URL is set. Falls back to null when missing,
// so the app keeps working with localStorage demo data during development.

let prisma: unknown = null

try {
  if (process.env.DATABASE_URL) {
    // Lazy require so the build doesn't fail when Prisma client hasn't been generated yet
    // (e.g. on first install before `npx prisma generate` has run)
    const { PrismaClient } = require('@prisma/client')
    const { PrismaMariaDb } = require('@prisma/adapter-mariadb')
    const adapter = new PrismaMariaDb({ url: process.env.DATABASE_URL })

    const globalForPrisma = globalThis as unknown as { prisma: unknown }
    prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = prisma
    }
  }
} catch {
  // Prisma client not generated yet, or adapter unavailable — fall back to demo data
}

export { prisma }
