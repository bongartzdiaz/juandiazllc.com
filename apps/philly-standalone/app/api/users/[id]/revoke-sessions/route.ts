/* POST /api/users/[id]/revoke-sessions
   Bump User.tokensInvalidAfter so every currently-issued JWT for this user
   is rejected on its next request. Admin-only.

   Also resets the lockout counter and clears the lock, so an admin can use
   this as a "force logout + unlock" action. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await params

  const prisma = getAuthPrisma()
  const target = await prisma.user.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, email: true },
  })
  if (!target) return jsonError('User not found', 404)

  await prisma.user.update({
    where: { id },
    data: {
      tokensInvalidAfter: new Date(),
      failedLoginCount: 0,
      lockedUntil: null,
    },
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: id,
    changes: {
      tokensInvalidAfter: { old: null, new: new Date().toISOString() },
      email: { old: target.email, new: target.email },
    },
  })

  return NextResponse.json({ ok: true })
}
