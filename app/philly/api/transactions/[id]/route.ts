/* GET/PATCH/DELETE /api/transactions/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const tx = await prisma.transaction.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      signatures: { orderBy: { createdAt: 'desc' } },
      _count: { select: { signatures: true } },
    },
  })
  if (!tx) return jsonError('Transaction not found', 404)
  return NextResponse.json({ data: tx })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.transaction.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Transaction not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = [
    'type', 'status', 'escrowNumber', 'titleCompany', 'buyerAgentId',
    'sellerAgentId', 'buyerContactId', 'sellerContactId', 'salePrice',
    'earnestMoney', 'notes', 'checklistJson', 'dealId', 'propertyId',
  ] as const
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (body.closingDate !== undefined) {
    data.closingDate = body.closingDate ? new Date(body.closingDate as string) : null
  }
  if (body.contractDate !== undefined) {
    data.contractDate = body.contractDate ? new Date(body.contractDate as string) : null
  }

  const tx = await prisma.transaction.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'transaction', entityId: id })
  publishEntityUpdated(scope.organizationId, 'transaction', id, scope.userId)
  return NextResponse.json({ data: tx })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.transaction.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Transaction not found', 404)

  await prisma.transaction.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'transaction', entityId: id })
  publishEntityDeleted(scope.organizationId, 'transaction', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
