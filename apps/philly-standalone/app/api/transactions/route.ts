/* GET  /api/transactions — list transactions
   POST /api/transactions — create transaction */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  dealId: z.string().max(120).optional(),
  propertyId: z.string().max(120).optional(),
  type: z.string().max(60).optional(),
  status: z.string().max(60).optional(),
  closingDate: z.string().optional(),
  contractDate: z.string().optional(),
  escrowNumber: z.string().max(120).optional(),
  titleCompany: z.string().max(255).optional(),
  buyerAgentId: z.string().max(120).optional(),
  sellerAgentId: z.string().max(120).optional(),
  buyerContactId: z.string().max(120).optional(),
  sellerContactId: z.string().max(120).optional(),
  salePrice: z.number().optional(),
  earnestMoney: z.number().optional(),
  notes: z.string().max(10000).optional(),
  checklist: z.any().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const type = url.searchParams.get('type') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  }

  const [txns, total] = await Promise.all([
    prisma.transaction.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { _count: { select: { signatures: true } } },
    }),
    prisma.transaction.count({ where }),
  ])

  return paginatedResponse(txns, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`transactions.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const txn = await prisma.transaction.create({
    data: {
      organizationId: scope.organizationId,
      dealId: body.dealId ?? null,
      propertyId: body.propertyId ?? null,
      type: body.type ?? 'purchase',
      status: body.status ?? 'pending',
      closingDate: body.closingDate ? new Date(body.closingDate) : null,
      contractDate: body.contractDate ? new Date(body.contractDate) : null,
      escrowNumber: body.escrowNumber ?? '',
      titleCompany: body.titleCompany ?? '',
      buyerAgentId: body.buyerAgentId ?? null,
      sellerAgentId: body.sellerAgentId ?? null,
      buyerContactId: body.buyerContactId ?? null,
      sellerContactId: body.sellerContactId ?? null,
      salePrice: body.salePrice ?? 0,
      earnestMoney: body.earnestMoney ?? 0,
      notes: body.notes ?? '',
      checklistJson: body.checklist ? JSON.stringify(body.checklist) : '[]',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'transaction', entityId: txn.id })
  publishEntityCreated(scope.organizationId, 'transaction', txn.id, scope.userId)
  return NextResponse.json({ data: txn }, { status: 201 })
}
