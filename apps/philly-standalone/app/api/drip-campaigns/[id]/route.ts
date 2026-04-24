/* GET/PATCH/DELETE /api/drip-campaigns/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const campaign = await prisma.dripCampaign.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!campaign) return jsonError('Campaign not found', 404)
  return NextResponse.json({ data: campaign })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.dripCampaign.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Campaign not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return jsonError('name cannot be empty', 400)
    data.name = name
  }
  if (body.type !== undefined) data.type = body.type
  if (body.status !== undefined) data.status = body.status
  if (body.steps !== undefined) data.stepsJson = JSON.stringify(body.steps)

  const campaign = await prisma.dripCampaign.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'dripCampaign', entityId: id })
  publishEntityUpdated(scope.organizationId, 'dripCampaign', id, scope.userId)
  return NextResponse.json({ data: campaign })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.dripCampaign.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Campaign not found', 404)

  await prisma.dripCampaign.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'dripCampaign', entityId: id })
  publishEntityDeleted(scope.organizationId, 'dripCampaign', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
