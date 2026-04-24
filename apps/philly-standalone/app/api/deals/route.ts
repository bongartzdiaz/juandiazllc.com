/* GET  /api/deals — list deals (paginated, filterable)
   POST /api/deals — create a deal */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { createDealSchema } from '@/lib/philly/validation/schemas'
import { SLO, withSpan } from '@/lib/philly/observability'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireSection('deals')
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const prisma = getAuthPrisma()

  const dealInclude = {
    stage: { select: { id: true, name: true, color: true } },
    contact: { select: { id: true, name: true } },
    owner: { select: { id: true, name: true } },
    pipeline: { select: { id: true, name: true } },
    project: { select: { id: true, title: true } },
  }

  /* Single deal by id: GET /api/deals?id=xxx */
  const dealId = url.searchParams.get('id')
  if (dealId) {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, pipeline: { organizationId: scope.organizationId } },
      include: dealInclude,
    })
    if (!deal) return jsonError('Deal not found', 404)
    return NextResponse.json({ data: deal })
  }

  const { page, limit, skip } = parsePagination(req)
  const pipelineId = url.searchParams.get('pipelineId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined
  const contactId = url.searchParams.get('contactId') ?? undefined
  const ownerId = url.searchParams.get('ownerId') ?? undefined
  const stageId = url.searchParams.get('stageId') ?? undefined
  const projectId = url.searchParams.get('projectId') ?? undefined

  const where = {
    pipeline: { organizationId: scope.organizationId },
    ...(pipelineId ? { pipelineId } : {}),
    ...(status ? { status } : {}),
    ...(contactId ? { contactId } : {}),
    ...(ownerId ? { ownerId } : {}),
    ...(stageId ? { stageId } : {}),
    ...(projectId ? { projectId } : {}),
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: dealInclude,
    }),
    prisma.deal.count({ where }),
  ])

  return paginatedResponse(deals, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('deals', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createDealSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  return withSpan(
    {
      name: 'deal.create',
      slo: SLO.CREATE_DEAL,
      op: 'db.create',
      attrs: { organizationId: scope.organizationId, pipelineId: body.pipelineId },
    },
    async () => {
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
          title: body.title,
          contactId: body.contactId ?? null,
          ownerId: scope.userId,
          valueCents: body.valueCents,
          probability: body.probability,
          status: body.status,
          dealType: body.dealType,
          expectedClose: body.expectedClose ? new Date(body.expectedClose) : null,
          notes: body.notes,
        },
        include: {
          stage: { select: { id: true, name: true, color: true } },
          contact: { select: { id: true, name: true } },
        },
      })

      await logAudit({ scope, action: 'create', entity: 'deal', entityId: deal.id })
      publishEntityCreated(scope.organizationId, 'deal', deal.id, scope.userId)
      return NextResponse.json({ data: deal }, { status: 201 })
    },
  )
}
