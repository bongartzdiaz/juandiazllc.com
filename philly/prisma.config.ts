// Prisma 7 configuration
// In Prisma 7 the connection URL must live in this file (or a driver adapter),
// not inside `datasource db { url = ... }` in schema.prisma.
// Used by `prisma generate`, `prisma migrate`, and other CLI commands.
// At runtime, the PrismaClient is instantiated with the MariaDB driver adapter
// in src/lib/db.ts so it can talk to MySQL via the same DATABASE_URL.

import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
})
