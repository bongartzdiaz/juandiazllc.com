/* GET  /api/commissions — commission records (paginated)
   POST /api/commissions — create commission record */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  agentId: z.string().trim().min(1, 'agentId is required').max(120),
  grossCents: z.number().positive('grossCents must be positive'),
  dealId: z.string().max(120).optional(),
  type: z.string().max(60).optional(),
  splitPct: z.number().optional(),
  status: z.string().max(60).optional(),
  notes: z.string().max(10000).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireSection('commissions')
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const agentId = url.searchParams.get('agentId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(agentId ? { agentId } : {}),
    ...(status ? { status } : {}),
  }

  const [records, total] = await Promise.all([
    prisma.commissionRecord.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
    }),
    prisma.commissionRecord.count({ where }),
  ])

  return paginatedResponse(records, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('commissions', ['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`commissions.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const splitPct = body.splitPct ?? 100
  const netCents = Math.round(body.grossCents * (splitPct / 100))

  const prisma = getAuthPrisma()
  const record = await prisma.commissionRecord.create({
    data: {
      organizationId: scope.organizationId,
      agentId: body.agentId,
      dealId: body.dealId ?? null,
      type: body.type ?? 'closing',
      grossCents: body.grossCents,
      splitPct,
      netCents,
      status: body.status ?? 'pending',
      notes: body.notes ?? '',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'commissionRecord', entityId: record.id })
  publishEntityCreated(scope.organizationId, 'commissionRecord', record.id, scope.userId)
  return NextResponse.json({ data: record }, { status: 201 })
}
