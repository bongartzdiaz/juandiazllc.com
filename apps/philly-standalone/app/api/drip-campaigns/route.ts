/* GET  /api/drip-campaigns — list drip campaigns
   POST /api/drip-campaigns — create campaign */

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
  name: z.string().trim().min(1, 'name is required').max(120),
  type: z.string().max(40).optional(),
  status: z.string().max(40).optional(),
  steps: z.array(z.unknown()).max(200).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? undefined

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(type ? { type } : {}),
  }
  const [campaigns, total] = await Promise.all([
    prisma.dripCampaign.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.dripCampaign.count({ where }),
  ])

  return paginatedResponse(campaigns, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`drip-campaigns.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const campaign = await prisma.dripCampaign.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      type: body.type ?? 'buyer',
      status: body.status ?? 'active',
      stepsJson: body.steps ? JSON.stringify(body.steps) : '[]',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'dripCampaign', entityId: campaign.id })
  publishEntityCreated(scope.organizationId, 'dripCampaign', campaign.id, scope.userId, campaign)
  return NextResponse.json({ data: campaign }, { status: 201 })
}
