/* GET /api/audit — paginated audit log (admin only) */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'
import { NextResponse } from 'next/server'
import { parseQuery } from '@/lib/philly/api/validate'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  entity: z.string().max(80).optional(),
  action: z.string().max(80).optional(),
  userId: z.string().max(80).optional(),
  range: z.enum(['1d', '7d', '30d']).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const q = parseQuery(req.nextUrl.searchParams, querySchema)
  if (q instanceof NextResponse) return q
  const { entity, action, userId, range: rangeParam } = q
  const { page, limit, skip } = parsePagination(req)

  const RANGE_MS: Record<string, number> = {
    '1d': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  const afterDate = rangeParam && RANGE_MS[rangeParam]
    ? new Date(Date.now() - RANGE_MS[rangeParam])
    : undefined

  const prisma = getAuthPrisma()

  const where = {
    organizationId: scope.organizationId,
    ...(entity ? { entity } : {}),
    ...(action ? { action } : {}),
    ...(userId ? { userId } : {}),
    ...(afterDate ? { createdAt: { gte: afterDate } } : {}),
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
