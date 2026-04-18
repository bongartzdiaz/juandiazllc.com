/* GET /api/email — list emails (with pagination + filters) */

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
  const accountId = url.searchParams.get('accountId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined
  const contactId = url.searchParams.get('contactId') ?? undefined
  const direction = url.searchParams.get('direction') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    account: { organizationId: scope.organizationId },
    ...(accountId ? { accountId } : {}),
    ...(status ? { status } : {}),
    ...(contactId ? { contactId } : {}),
    ...(direction ? { direction } : {}),
  }

  const [emails, total] = await Promise.all([
    prisma.email.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.email.count({ where }),
  ])

  return paginatedResponse(emails, total, { page, limit, skip })
}
