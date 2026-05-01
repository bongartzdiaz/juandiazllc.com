/* GET /api/health — unauthenticated liveness + readiness probe.
   Returns 200 if the process is up AND can reach the DB.
   Returns 503 if the DB check fails.
   Shape is intentionally small and stable for monitors / uptime tools. */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const result: {
    status: 'ok' | 'degraded' | 'down'
    uptimeMs: number
    timestamp: string
    checks: { name: string; ok: boolean; latencyMs?: number; detail?: string }[]
    version: string
  } = {
    status: 'ok',
    uptimeMs: Math.round(process.uptime() * 1000),
    timestamp: new Date().toISOString(),
    checks: [],
    version: process.env.npm_package_version ?? '0.1.0',
  }

  /* DB liveness check with short timeout so a stuck DB doesn't pin the probe.
     Clear the timer on success so we don't leak a Node timer per probe.
     The underlying $queryRawUnsafe still runs to completion if the
     timeout wins (Prisma doesn't expose AbortSignal on raw queries) —
     a single in-flight `SELECT 1` is the connection-leak ceiling.
     Bundle BJ audit fix. */
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    const prisma = getAuthPrisma()
    const dbStart = Date.now()
    await Promise.race([
      prisma.$queryRawUnsafe('SELECT 1').finally(() => {
        if (timer) clearTimeout(timer)
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('db timeout after 2000ms')), 2000)
      }),
    ])
    result.checks.push({ name: 'database', ok: true, latencyMs: Date.now() - dbStart })
  } catch (err) {
    if (timer) clearTimeout(timer)
    result.status = 'down'
    result.checks.push({
      name: 'database',
      ok: false,
      detail: err instanceof Error ? err.message : 'connection failed',
    })
  }

  return NextResponse.json(result, {
    status: result.status === 'ok' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
