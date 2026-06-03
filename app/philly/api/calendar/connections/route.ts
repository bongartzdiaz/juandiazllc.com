/* GET /api/calendar/connections
 *
 * Returns the current user's calendar connections — provider key,
 * connected email, status, scopes, last-used. Tokens are NEVER
 * exposed; the encrypted bytes never leave lib/philly/calendar/.
 *
 * Used by:
 *   - /onboarding/calendar wizard step (real connect/disconnect UX)
 *   - /settings/integrations (post-onboarding management surface)
 */

import { NextResponse } from 'next/server'
import { requireScope } from '@/lib/philly/auth-helpers'
import { listConnectionsForUser } from '@/lib/philly/calendar/connection'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const connections = await listConnectionsForUser(scope.userId)

  return NextResponse.json({
    data: connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      providerEmail: c.providerEmail,
      status: c.status,
      scopes: c.scopes,
      connectedAt: c.connectedAt.toISOString(),
      lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
      lastError: c.lastError,
      // Push-sync channel state (Bundle D). Lets the settings UI render
      // a "syncing in real-time" badge with the next renewal time without
      // a second round-trip. Null when no channel is active for this
      // connection (e.g. provider rejected `watch`, or channel expired
      // and renewal failed).
      channel: c.channel
        ? {
            id: c.channel.id,
            status: c.channel.status,
            expiresAt: c.channel.expiresAt.toISOString(),
            lastRenewedAt: c.channel.lastRenewedAt?.toISOString() ?? null,
          }
        : null,
    })),
  })
}
