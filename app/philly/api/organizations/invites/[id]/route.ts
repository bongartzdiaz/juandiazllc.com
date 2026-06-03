import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/organizations/invites/[id]
 *   Revoke a pending invite. Admin/manager only. Silently returns 404
 *   for invites that don't belong to the caller's org so we don't
 *   leak existence across tenants.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`invite-revoke:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params
  const prisma = getAuthPrisma()

  const invite = await prisma.invite.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, email: true, acceptedAt: true, revokedAt: true },
  })

  if (!invite) return jsonError('Invite not found', 404)
  if (invite.acceptedAt) return jsonError('Invite already accepted; cannot revoke', 409)
  if (invite.revokedAt) return jsonError('Invite already revoked', 409)

  const updated = await prisma.invite.update({
    where: { id },
    data: { revokedAt: new Date(), revokedByUserId: scope.userId },
    select: { id: true, revokedAt: true },
  })

  await logAudit({
    scope,
    action: 'delete',
    entity: 'invite',
    entityId: id,
    changes: { email: { old: invite.email, new: null } },
  })

  logger.info('[invite] revoked', { inviteId: id, by: scope.userId })

  return NextResponse.json({ data: updated })
}
