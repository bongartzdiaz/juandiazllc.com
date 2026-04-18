/* GET  /api/commissions — commission records (paginated)
   POST /api/commissions — create commission record */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
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
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.agentId) return jsonError('agentId is required', 400)
  if (!body.grossCents || body.grossCents <= 0) return jsonError('grossCents must be positive', 400)

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
