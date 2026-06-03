/* GET  /api/notifications — paginated notifications for current user
   POST /api/notifications — create a notification (internal use) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { parseQuery } from '@/lib/philly/api/validate'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  unread: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const q = parseQuery(req.nextUrl.searchParams, querySchema)
  if (q instanceof NextResponse) return q
  const unreadOnly = q.unread === 'true'

  const prisma = getAuthPrisma()
  const where = {
    userId: scope.userId,
    organizationId: scope.organizationId,
    ...(unreadOnly ? { read: false } : {}),
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.notification.count({ where }),
  ])

  return paginatedResponse(notifications, total, { page, limit, skip })
}
