/* DELETE /api/users/[id]/membership
   Remove a user's Membership row in the caller's active org.

   Multi-org context (Bundle G):
   - Membership rows model "user X has access to org Y with role R".
   - Removing a Membership revokes that user's access to the caller's
     org. It does NOT delete the User row, and it does NOT touch the
     user's home org.
   - Refuses to remove a user's HOME-org membership (User.organizationId
     == scope.organizationId). That's a "delete user" operation, not
     a "revoke access" operation, and it must be done explicitly.
   - Last-admin-per-org guard: refuses if removing this membership
     would leave the org with zero admins. Source of truth is the
     Membership table (every home-org user has a mirrored Membership
     row by migration backfill + POST /api/users invariant).

   Business logic lives in lib/membership/remove.ts so the guards
   can be unit-tested without spinning up a Next.js request. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { removeMembership } from '@/lib/membership/remove'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id: targetUserId } = await params

  const prisma = getAuthPrisma()
  const result = await removeMembership(prisma, {
    targetUserId,
    organizationId: scope.organizationId,
  })

  if ('code' in result) {
    switch (result.code) {
      case 'USER_NOT_FOUND':
        return jsonError('User not found', 404)
      case 'IS_HOME_ORG':
        return jsonError(
          'Cannot remove a user from their home organization via this endpoint',
          400,
        )
      case 'NOT_A_MEMBER':
        return jsonError('User is not a member of this organization', 404)
      case 'LAST_ADMIN':
        return jsonError('Cannot remove the last admin of this organization', 400)
    }
  }

  await logAudit({
    scope,
    action: 'delete',
    entity: 'membership',
    entityId: result.removed.id,
    changes: {
      userId: { old: targetUserId, new: null },
      organizationId: { old: scope.organizationId, new: null },
      role: { old: result.removed.role, new: null },
      email: { old: result.removed.email, new: result.removed.email },
    },
  }).catch(() => { /* audit best-effort */ })

  return NextResponse.json({ ok: true })
}
