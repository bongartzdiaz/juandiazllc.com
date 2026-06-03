/* GET  /api/transactions — list transactions
   POST /api/transactions — create transaction */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { findForeignKeyNotInOrg } from '@/lib/philly/v1-fk-guard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()

  // BE-09: every client-supplied relation must belong to the caller's org.
  const badFk = await findForeignKeyNotInOrg(prisma, scope.organizationId, [
    { field: 'dealId', model: 'deal', value: body.dealId },
    { field: 'propertyId', model: 'property', value: body.propertyId },
    { field: 'buyerAgentId', model: 'user', value: body.buyerAgentId },
    { field: 'sellerAgentId', model: 'user', value: body.sellerAgentId },
    { field: 'buyerContactId', model: 'contact', value: body.buyerContactId },
    { field: 'sellerContactId', model: 'contact', value: body.sellerContactId },
  ])
  if (badFk) return jsonError(`${badFk} does not belong to your organization`, 400)

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
