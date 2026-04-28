/* GET /api/me/orgs — list every organization the caller is a
   member of (the union of their home org + any Membership rows),
   plus their role in each. Used by the topbar org-switcher. */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  // Single query, no N+1 — Prisma's `include` joins the Org row.
  const memberships = await prisma.membership.findMany({
    where: { userId: scope.userId },
    select: {
      organizationId: true,
      role: true,
      organization: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    activeOrganizationId: scope.organizationId,
    organizations: memberships.map((m) => ({
      id: m.organizationId,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
    })),
  })
}
