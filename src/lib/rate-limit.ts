/* ---------------------------------------------------------------
   In-memory token-bucket rate limiter
   ---------------------------------------------------------------
   - Per-key (IP, userId, orgId, or composite)
   - Sliding window via token bucket
   - Returns { ok, remaining, retryAfter } and a ready-to-throw NextResponse
   - For multi-instance deployments, swap _store with a Redis adapter
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { jsonError } from '@/lib/auth-helpers'

interface Bucket {
  tokens: number
  updatedAt: number
}

interface RateLimitOptions {
  /** Bucket capacity (max burst). */
  capacity: number
  /** Refill rate in tokens per second. */
  refillPerSec: number
}

interface RateLimitResult {
  ok: boolean
  remaining: number
  /** Seconds until next token is available (rounded up). 0 if ok. */
  retryAfter: number
}

const _store = new Map<string, Bucket>()

// Periodic cleanup of stale buckets to prevent memory growth in long-running
// processes. Buckets untouched for >1 hour are pruned.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000
const STALE_MS = 60 * 60 * 1000

let _cleanupStarted = false
function ensureCleanup() {
  if (_cleanupStarted || typeof setInterval === 'undefined') return
  _cleanupStarted = true
  const interval = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of _store) {
      if (now - bucket.updatedAt > STALE_MS) _store.delete(key)
    }
  }, CLEANUP_INTERVAL_MS)
  // Don't keep the process alive solely for this timer.
  if (typeof interval === 'object' && interval && 'unref' in interval) {
    ;(interval as { unref: () => void }).unref()
  }
}

/**
 * Consume one token from the named bucket. Creates the bucket on first use.
 *
 * @param key   Unique bucket identifier (e.g. `auth:ip:1.2.3.4`).
 * @param opts  Capacity and refill rate.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  ensureCleanup()
  const now = Date.now()
  const bucket = _store.get(key) ?? { tokens: opts.capacity, updatedAt: now }

  // Refill based on elapsed time
  const elapsedSec = (now - bucket.updatedAt) / 1000
  bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedSec * opts.refillPerSec)
  bucket.updatedAt = now

  if (bucket.tokens < 1) {
    _store.set(key, bucket)
    const retryAfter = Math.ceil((1 - bucket.tokens) / opts.refillPerSec)
    return { ok: false, remaining: 0, retryAfter }
  }

  bucket.tokens -= 1
  _store.set(key, bucket)
  return { ok: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 }
}

/**
 * Extract the best-effort client IP from a NextRequest.
 * Falls back to a constant key if no IP header is available so that
 * unknown clients are still rate-limited as a group rather than not at all.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

/**
 * Common preset: strict limit suitable for unauthenticated mutations
 * (login, public form submits). Blocks burst then allows ~1 req/sec.
 */
export const PRESET_AUTH = { capacity: 10, refillPerSec: 1 } as const

/**
 * Common preset: moderate limit for authenticated mutations (POST/PATCH/DELETE).
 * Allows healthy interactive usage while blocking abusive scripts.
 */
export const PRESET_MUTATION = { capacity: 60, refillPerSec: 2 } as const

/**
 * Common preset: generous limit for read-heavy endpoints (GET).
 */
export const PRESET_READ = { capacity: 300, refillPerSec: 10 } as const

/**
 * Common preset: very strict limit for outbound message sending
 * (email, SMS, webhooks) to prevent abuse and runaway loops.
 */
export const PRESET_SEND = { capacity: 20, refillPerSec: 0.5 } as const

/**
 * Build a 429 NextResponse with proper Retry-After + RateLimit-* headers.
 */
export function rateLimitResponse(result: RateLimitResult, message = 'Too many requests'): NextResponse {
  const res = jsonError(message, 429)
  res.headers.set('Retry-After', String(Math.max(1, result.retryAfter)))
  res.headers.set('X-RateLimit-Remaining', '0')
  return res
}

/**
 * Convenience: enforce rate limit and return either null (ok) or a
 * 429 NextResponse that the caller can return directly.
 *
 * Usage:
 *   const limited = enforceRateLimit(`api:${scope.userId}`, PRESET_MUTATION)
 *   if (limited) return limited
 */
export function enforceRateLimit(key: string, opts: RateLimitOptions): NextResponse | null {
  const result = rateLimit(key, opts)
  if (result.ok) return null
  return rateLimitResponse(result)
}
