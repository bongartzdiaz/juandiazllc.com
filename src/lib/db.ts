// Prisma client singleton
// Will be activated when DATABASE_URL is configured
// Run `npx prisma generate` after setting up the database

let prisma: unknown = null

try {
  // Dynamic import to avoid build errors when Prisma hasn't been generated
  const { PrismaClient } = require('@prisma/client')
  const globalForPrisma = globalThis as unknown as { prisma: unknown }
  prisma = globalForPrisma.prisma ?? new PrismaClient()
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
  }
} catch {
  // Prisma not generated yet — will use demo data
}

export { prisma }
