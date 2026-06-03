/* GET /api/contacts/[id]/activity — activity feed for a contact */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!contact) return jsonError('Contact not found', 404)

  const { page, limit, skip } = parsePagination(req)
  const where = { contactId: id }
  const [activities, total] = await Promise.all([
    // org-scope-lint-ok: parent contact verified in scope.organizationId above; activities scoped by that contactId
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: { user: { select: { id: true, name: true } } },
    }),
    // org-scope-lint-ok: see above — scoped by the org-verified contactId
    prisma.activity.count({ where }),
  ])

  return paginatedResponse(activities, total, { page, limit, skip })
}
