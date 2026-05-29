/* prisma.config.ts
   ──────────────────────────────────────────────────────────────────
   Prisma 7 moved datasource URL out of schema.prisma. The runtime
   path uses @prisma/adapter-mariadb with `process.env.DATABASE_URL`;
   the CLI (migrate deploy, db push, studio) reads from this file.

   Added 2026-05-27 to support local-preview db migrations against the
   Dockerized MariaDB. Production deploys via the adapter path; this
   file only affects CLI operations. */

import { defineConfig } from 'prisma/config'
import { config as loadEnv } from 'dotenv'

// Explicitly load .env.local first (Next.js convention), then fall
// back to .env. The default `dotenv/config` only reads .env.
loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
