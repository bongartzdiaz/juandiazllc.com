/* GET /api/audit — paginated audit log (admin only) */

import { NextRequest } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'
import { parsePagination, paginatedResponse } from '@/lib/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const entity = url.searchParams.get('entity') ?? undefined
  const action = url.searchParams.get('action') ?? undefined
  const userId = url.searchParams.get('userId') ?? undefined
  const { page, limit, skip } = parsePagination(req)

  const prisma = getAuthPrisma()

  const where = {
    organizationId: scope.organizationId,
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return paginatedResponse(logs, total, { page, limit, skip })
}
