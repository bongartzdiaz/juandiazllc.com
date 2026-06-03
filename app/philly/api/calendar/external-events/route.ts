/* GET /api/calendar/external-events?provider=google|microsoft&from=ISO&to=ISO&limit=N
 *
 * Returns events from the user's connected third-party calendar.
 * Distinct from /api/calendar (which serves DEUS-internal events
 * stored in Postgres) — this proxies the provider's API in real-time.
 *
 * Tokens never leave the server. The accessToken is decrypted +
 * (lazily refreshed) inside lib/philly/calendar/connection.ts; this
 * handler only sees a normalised event shape.
 *
 * Defaults: window = next 14 days, limit = 50.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { listEvents } from '@/lib/philly/calendar/events'
import { PROVIDER_KEYS, type ProviderKey } from '@/lib/philly/calendar/providers'
import { enforceRateLimit, PRESET_READ } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`cal-events:${scope.userId}`, PRESET_READ)
  if (limited) return limited

  const url = new URL(req.url)
  const providerParam = url.searchParams.get('provider')
  const from = url.searchParams.get('from') ?? undefined
  const to = url.searchParams.get('to') ?? undefined
  const limitRaw = url.searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, Math.min(250, parseInt(limitRaw, 10) || 50)) : undefined

  if (!providerParam || !PROVIDER_KEYS.includes(providerParam as ProviderKey)) {
    return jsonError(`provider must be one of: ${PROVIDER_KEYS.join(', ')}`, 400)
  }

  const result = await listEvents({
    userId: scope.userId,
    provider: providerParam as ProviderKey,
    from,
    to,
    limit,
  })

  if (!result.ok) {
    if (result.error === 'not_connected') {
      return jsonError('Calendar not connected for this provider', 404)
    }
    return jsonError(`Calendar fetch failed: ${result.detail ?? result.error}`, 502)
  }

  return NextResponse.json({ data: { events: result.events } })
}
