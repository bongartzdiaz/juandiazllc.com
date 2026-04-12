/* GET  /api/drip-campaigns — list drip campaigns
   POST /api/drip-campaigns — create campaign */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? undefined

  const prisma = getAuthPrisma()
  const campaigns = await prisma.dripCampaign.findMany({
    where: {
      organizationId: scope.organizationId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: campaigns })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const campaign = await prisma.dripCampaign.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      type: body.type ?? 'buyer',
      status: body.status ?? 'active',
      stepsJson: body.steps ? JSON.stringify(body.steps) : '[]',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'dripCampaign', entityId: campaign.id })
  return NextResponse.json({ data: campaign }, { status: 201 })
}
