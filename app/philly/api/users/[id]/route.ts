import { NextRequest, NextResponse } from 'next/server'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { validateBody } from '@/lib/philly/validation'
import { deleteUserSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { logger } from '@/lib/philly/logger'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/users/[id]
 *   Body: { reason?: string }
 *
 * Admin-only. Soft-deletes a teammate (releases their seat).
 * Cannot self-delete via this route — admins who want to leave
 * must use DELETE /api/me with the typed-confirmation flow.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`user-delete:${scope.organizationId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await params

  // No body required; reason is optional
  const parsed = req.headers.get('content-length')
    ? await validateBody(req, deleteUserSchema)
    : { success: true as const, data: { reason: undefined } }
  if (!parsed.success) return parsed.response

  if (id === scope.userId) {
    return jsonError(
      'Use DELETE /api/me with the typed confirmation to delete your own account.',
      400,
    )
  }

  const prisma = getAuthPrisma()

  const target = await prisma.user.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, email: true, role: true, deletedAt: true },
  })

  // 404 across tenants — never leak existence of users in other orgs
  if (!target) return jsonError('User not found', 404)
  if (target.deletedAt) return jsonError('User already scheduled for deletion', 410)

  // Last-admin guardrail
  if (target.role === 'admin') {
    const adminCount = await prisma.user.count({
      where: {
        organizationId: scope.organizationId,
        role: 'admin',
        deletedAt: null,
      },
    })
    if (adminCount <= 1) {
      return jsonError(
        'Cannot delete the last admin. Promote another teammate to admin first.',
        409,
      )
    }
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        deletedAt: now,
        deletedByUserId: scope.userId,
        tokensInvalidAfter: now,
      },
    })
    await tx.session.deleteMany({ where: { userId: target.id } })
  })

  await logAudit({
    scope,
    action: 'delete',
    entity: 'user',
    entityId: target.id,
    changes: {
      kind: { old: null, new: 'admin_erasure' },
      target_email: { old: target.email, new: null },
      reason: { old: null, new: parsed.data.reason ?? null },
      deletedAt: { old: null, new: now.toISOString() },
    },
  }).catch(() => { /* audit best-effort */ })

  logger.info('[users] admin-erasure', {
    targetUserId: target.id,
    by: scope.userId,
    organizationId: scope.organizationId,
  })

  return NextResponse.json({
    data: {
      deleted: true,
      userId: target.id,
      deletedAt: now.toISOString(),
      hardPurgeAfter: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })
}
