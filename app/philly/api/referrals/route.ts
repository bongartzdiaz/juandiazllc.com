/* GET  /api/referrals — list referrals
   POST /api/referrals — create referral */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const referrerId = url.searchParams.get('referrerId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(referrerId ? { referrerId } : {}),
    ...(status ? { status } : {}),
  }

  const [referrals, total] = await Promise.all([
    prisma.referral.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.referral.count({ where }),
  ])

  // Manual contact join
  const ids = Array.from(new Set(referrals.flatMap(r => [r.referrerId, r.referredId]).filter(Boolean)))
  const contacts = ids.length > 0
    ? await prisma.contact.findMany({
        where: { id: { in: ids }, organizationId: scope.organizationId },
        select: { id: true, name: true },
      })
    : []
  const byId = new Map(contacts.map(c => [c.id, c]))
  const enriched = referrals.map(r => ({
    ...r,
    referrer: byId.get(r.referrerId) ?? null,
    referred: byId.get(r.referredId) ?? null,
  }))

  return paginatedResponse(enriched, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.referrerId?.trim()) return jsonError('referrerId is required', 400)
  if (!body.referredId?.trim()) return jsonError('referredId is required', 400)

  const prisma = getAuthPrisma()
  const ref = await prisma.referral.create({
    data: {
      organizationId: scope.organizationId,
      referrerId: body.referrerId,
      referredId: body.referredId,
      dealId: body.dealId ?? null,
      status: body.status ?? 'pending',
      commissionPct: body.commissionPct ?? 0,
      commissionCents: body.commissionCents ?? 0,
      notes: body.notes ?? '',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'referral', entityId: ref.id })
  return NextResponse.json({ data: ref }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.referral.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Referral not found', 404)

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.commissionPct !== undefined) data.commissionPct = body.commissionPct
  if (body.commissionCents !== undefined) data.commissionCents = body.commissionCents
  if (body.notes !== undefined) data.notes = body.notes
  if (body.dealId !== undefined) data.dealId = body.dealId

  const ref = await prisma.referral.update({ where: { id: body.id }, data })
  await logAudit({ scope, action: 'update', entity: 'referral', entityId: body.id })
  return NextResponse.json({ data: ref })
}

export async function DELETE(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.referral.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Referral not found', 404)

  await prisma.referral.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'referral', entityId: id })
  return new NextResponse(null, { status: 204 })
}
