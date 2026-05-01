/* GET /api/admin/scim-groups
   ───────────────────────────────────────────────────────────
   List SCIM groups for the caller's org with the operator-set
   role + dashboardSections so the admin UI can render them.

   Bundle BX. Admin-only; rate-limited; audit-logged on writes
   (writes live at /api/admin/scim-groups/[id]). */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const groups = await prisma.scimGroup.findMany({
    where: { organizationId: scope.organizationId },
    orderBy: { displayName: 'asc' },
    select: {
      id: true,
      scimExternalId: true,
      displayName: true,
      role: true,
      dashboardSections: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { members: true } },
    },
  })

  return NextResponse.json({
    data: groups.map((g) => ({
      id: g.id,
      externalId: g.scimExternalId,
      displayName: g.displayName,
      role: g.role,
      dashboardSections: g.dashboardSections,
      memberCount: g._count.members,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
  })
}
