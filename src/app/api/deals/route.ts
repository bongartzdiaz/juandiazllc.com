/* GET  /api/deals — list deals (paginated, filterable)
   POST /api/deals — create a deal */

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
  const pipelineId = url.searchParams.get('pipelineId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    pipeline: { organizationId: scope.organizationId },
    ...(pipelineId ? { pipelineId } : {}),
    ...(status ? { status } : {}),
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        stage: { select: { id: true, name: true, color: true } },
        contact: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    }),
    prisma.deal.count({ where }),
  ])

  return paginatedResponse(deals, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: {
    pipelineId?: string; stageId?: string; title?: string
    contactId?: string; projectId?: string; valueCents?: number
    probability?: number; expectedClose?: string; notes?: string
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.pipelineId) return jsonError('pipelineId is required', 400)
  if (!body.stageId) return jsonError('stageId is required', 400)
  if (!body.title?.trim()) return jsonError('title is required', 400)

  const prisma = getAuthPrisma()

  // Verify pipeline belongs to org
  const pipeline = await prisma.pipeline.findFirst({
    where: { id: body.pipelineId, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!pipeline) return jsonError('Pipeline not found', 404)

  const deal = await prisma.deal.create({
    data: {
      pipelineId: body.pipelineId,
      stageId: body.stageId,
      title: body.title.trim(),
      contactId: body.contactId ?? null,
      projectId: body.projectId ?? null,
      ownerId: scope.userId,
      valueCents: body.valueCents ?? 0,
      probability: Math.min(100, Math.max(0, body.probability ?? 50)),
      expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
      notes: body.notes ?? '',
    },
    include: {
      stage: { select: { id: true, name: true, color: true } },
      contact: { select: { id: true, name: true } },
    },
  })

  await logAudit({ scope, action: 'create', entity: 'kanbanCard', entityId: deal.id })
  return NextResponse.json({ data: deal }, { status: 201 })
}
