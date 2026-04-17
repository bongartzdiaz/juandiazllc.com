/* GET  /api/notifications — paginated notifications for current user
   POST /api/notifications — create a notification (internal use) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unread') === 'true'

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
