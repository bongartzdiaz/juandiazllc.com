/* GET  /api/cma — list CMA reports
   POST /api/cma — create CMA report */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
  }

  const [reports, total] = await Promise.all([
    prisma.cmaReport.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.cmaReport.count({ where }),
  ])

  return paginatedResponse(reports, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const report = await prisma.cmaReport.create({
    data: {
      organizationId: scope.organizationId,
      agentId: body.agentId ?? scope.userId,
      contactId: body.contactId ?? null,
      propertyId: body.propertyId ?? null,
      subjectAddress: body.subjectAddress ?? '',
      subjectCity: body.subjectCity ?? '',
      subjectZip: body.subjectZip ?? '',
      subjectBeds: body.subjectBeds ?? null,
      subjectBaths: body.subjectBaths ?? null,
      subjectSqft: body.subjectSqft ?? null,
      estimatedValue: body.estimatedValue ?? 0,
      comparablesJson: body.comparables ? JSON.stringify(body.comparables) : '[]',
      adjustmentsJson: body.adjustments ? JSON.stringify(body.adjustments) : '{}',
      status: 'draft',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'cmaReport', entityId: report.id })
  return NextResponse.json({ data: report }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.cmaReport.findFirst({
    where: { id: body.id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Report not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = [
    'subjectAddress', 'subjectCity', 'subjectZip', 'subjectBeds', 'subjectBaths',
    'subjectSqft', 'estimatedValue', 'status', 'contactId', 'propertyId',
  ] as const
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k]
  if (body.comparables !== undefined) {
    data.comparablesJson = typeof body.comparables === 'string' ? body.comparables : JSON.stringify(body.comparables)
  }
  if (body.adjustments !== undefined) {
    data.adjustmentsJson = typeof body.adjustments === 'string' ? body.adjustments : JSON.stringify(body.adjustments)
  }

  const report = await prisma.cmaReport.update({ where: { id: body.id }, data })
  await logAudit({ scope, action: 'update', entity: 'cmaReport', entityId: body.id })
  return NextResponse.json({ data: report })
}

export async function DELETE(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return jsonError('id is required', 400)

  const prisma = getAuthPrisma()
  const existing = await prisma.cmaReport.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Report not found', 404)

  await prisma.cmaReport.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'cmaReport', entityId: id })
  return new NextResponse(null, { status: 204 })
}
