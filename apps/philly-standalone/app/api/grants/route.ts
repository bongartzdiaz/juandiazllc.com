/* GET  /api/grants — list grants
   POST /api/grants — create grant */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parseQuery } from '@/lib/philly/api/validate'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { createGrantSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const querySchema = z.object({
  status: z.string().max(40).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const q = parseQuery(req.nextUrl.searchParams, querySchema)
  if (q instanceof NextResponse) return q
  const { status } = q

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
  }

  const [grants, total] = await Promise.all([
    prisma.grant.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.grant.count({ where }),
  ])

  return paginatedResponse(grants, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`grants.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, createGrantSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const grant = await prisma.grant.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title,
      funder: body.funder,
      amountCents: body.amountCents,
      status: body.status,
      appliedDate: body.appliedDate ? new Date(body.appliedDate) : null,
      awardedDate: body.awardedDate ? new Date(body.awardedDate) : null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      description: body.description,
      requirements: body.requirements,
    },
  })

  publishEntityCreated(scope.organizationId, 'grant', grant.id, scope.userId)
  return NextResponse.json({ data: grant }, { status: 201 })
}
