/* GET /api/email — list emails (with pagination + filters) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { parseQuery } from '@/lib/philly/api/validate'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  accountId: z.string().max(80).optional(),
  status: z.string().max(40).optional(),
  contactId: z.string().max(80).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const q = parseQuery(req.nextUrl.searchParams, querySchema)
  if (q instanceof NextResponse) return q
  const { accountId, status, contactId, direction } = q

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
