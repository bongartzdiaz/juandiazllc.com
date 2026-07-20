/* GET /api/health — unauthenticated liveness + readiness probe.

   Returns 200 if the process is up AND the critical dependencies
   the app NEEDS to function are reachable. Returns 503 otherwise.

   Critical = database. Anything else (Stripe, Supabase auth, email
   provider) is reported as a check but does NOT downgrade overall
   status to 503 — they're degradation signals for monitoring, not
   "the app is down". Distinguishing "down" from "degraded" lets the
   uptime monitor page on hard outages and the dashboard surface soft
   issues without false-positive alerts. */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface Check {
  name: string
  ok: boolean
  /** Whether a fail on this check should flip overall status to "down". */
  critical: boolean
  latencyMs?: number
  detail?: string
}

const TIMEOUT_MS = 2_000

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${what} timeout after ${ms}ms`)), ms),
    ),
  ])
}

async function checkDatabase(): Promise<Check> {
  // Same contract as the Stripe check: absent config is "not running
  // here", not "down". The CRM database lives with the DEUS-SHARED
  // deployment — a marketing-only deploy without DATABASE_URL should
  // report degraded (200), not page the uptime monitor with a 503.
  if (!process.env.DATABASE_URL) {
    return {
      name: 'database',
      ok: true,
      critical: false,
      detail: 'not configured — CRM data lives on the DEUS deployment',
    }
  }
  const start = Date.now()
  try {
    const prisma = getAuthPrisma()
    await withTimeout(prisma.$queryRawUnsafe('SELECT 1'), TIMEOUT_MS, 'db')
    return { name: 'database', ok: true, critical: true, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      name: 'database',
      ok: false,
      critical: true,
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : 'connection failed',
    }
  }
}

async function checkSupabaseAuth(): Promise<Check> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    return { name: 'supabase_auth', ok: false, critical: false, detail: 'env not set' }
  }
  const start = Date.now()
  try {
    // Reachability probe. We don't care about authorization here —
    // Supabase /auth/v1/* often returns 401 to unauthenticated calls,
    // but THAT is proof the service is up. Treat any response < 500
    // as "reachable"; only 5xx or network error counts as down.
    const res = await withTimeout(
      fetch(`${url}/auth/v1/`, { method: 'GET' }),
      TIMEOUT_MS,
      'supabase_auth',
    )
    const reachable = res.status < 500
    return {
      name: 'supabase_auth',
      ok: reachable,
      critical: false,
      latencyMs: Date.now() - start,
      detail: reachable ? undefined : `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      name: 'supabase_auth',
      ok: false,
      critical: false,
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : 'fetch failed',
    }
  }
}

async function checkStripe(): Promise<Check> {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    // Not a failure when Stripe isn't configured — the customer might
    // be on invoice billing only.
    return { name: 'stripe', ok: true, critical: false, detail: 'not configured' }
  }
  const start = Date.now()
  try {
    // Cheapest authenticated Stripe call: GET /v1/balance returns one
    // row of cached balance data. Verifies key + network reachability
    // without spending budget on test charges.
    const res = await withTimeout(
      fetch('https://api.stripe.com/v1/balance', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
      }),
      TIMEOUT_MS,
      'stripe',
    )
    return {
      name: 'stripe',
      ok: res.ok,
      critical: false,
      latencyMs: Date.now() - start,
      detail: res.ok ? undefined : `HTTP ${res.status}`,
    }
  } catch (err) {
    return {
      name: 'stripe',
      ok: false,
      critical: false,
      latencyMs: Date.now() - start,
      detail: err instanceof Error ? err.message : 'fetch failed',
    }
  }
}

function checkEmailEnv(): Check {
  // Synchronous — just confirms env var presence. We don't ping Resend
  // on every health check to avoid burning request budget.
  const ok = !!process.env.RESEND_API_KEY
  return {
    name: 'email_provider',
    ok,
    critical: false,
    detail: ok ? 'resend configured' : 'RESEND_API_KEY not set — invites will not send',
  }
}

export async function GET() {
  const started = Date.now()

  // Run network checks in parallel — db + supabase + stripe; email is sync.
  const [database, supabaseAuth, stripe] = await Promise.all([
    checkDatabase(),
    checkSupabaseAuth(),
    checkStripe(),
  ])
  const email = checkEmailEnv()

  const checks: Check[] = [database, supabaseAuth, stripe, email]
  const anyCriticalDown = checks.some((c) => !c.ok && c.critical)
  const anySoftDown = checks.some((c) => !c.ok && !c.critical)

  const status: 'ok' | 'degraded' | 'down' = anyCriticalDown
    ? 'down'
    : anySoftDown
      ? 'degraded'
      : 'ok'

  const result = {
    status,
    uptimeMs: Math.round(process.uptime() * 1000),
    timestamp: new Date().toISOString(),
    checks: checks.map(({ critical, ...rest }) => ({ ...rest, critical })),
    version: process.env.npm_package_version ?? '0.1.0',
  }

  void started

  return NextResponse.json(result, {
    // Return 503 only when a CRITICAL dependency is down. "degraded"
    // returns 200 so uptime monitors don't false-page on an unrelated
    // SaaS hiccup; the body still surfaces the problem for the
    // operations dashboard to read.
    status: status === 'down' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
