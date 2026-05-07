/* DELETE /api/calendar/connections/[id]
 *
 * Soft-disconnects a calendar — marks status='revoked', keeps the
 * encrypted token bytes for 30 days for audit / rebound, then a
 * janitor job hard-deletes. Same pattern as user soft-delete.
 *
 * Owner-only: a user can only revoke their own connections. Admins
 * cannot revoke another user's calendar from this endpoint (use
 * DELETE /api/users/[id] which cascades).
 */

import { NextResponse } from 'next/server'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { revokeConnection } from '@/lib/philly/calendar/connection'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  if (!id) return jsonError('id required', 400)

  const limited = enforceRateLimit(`cal-disconnect:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const ok = await revokeConnection(id, scope.userId)
  if (!ok) return jsonError('Calendar connection not found', 404)

  logger.info('[calendar] connection revoked', {
    userId: scope.userId,
    connectionId: id,
  })

  // Audit revocation — entity=integration, action=delete. The `kind`
  // field disambiguates calendar from other integration types when an
  // auditor scans the log. The connection.id is the durable reference
  // even after the row has its status flipped to 'revoked'.
  await logAudit({
    scope,
    action: 'delete',
    entity: 'integration',
    entityId: id,
    changes: {
      kind: { old: 'calendar', new: 'calendar' },
      status: { old: 'active', new: 'revoked' },
    },
  })

  return NextResponse.json({ data: { id, status: 'revoked' } })
}
