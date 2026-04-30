/* GET    /api/open-houses/[id] — single open house
   PATCH  /api/open-houses/[id] — update (reschedule, notes, status)
   DELETE /api/open-houses/[id] — cancel/remove */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

const ohInclude = {
  property: { select: { id: true, title: true, address: true, city: true, priceCents: true } },
  _count: { select: { visitors: true } },
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const oh = await prisma.openHouse.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    include: ohInclude,
  })
  if (!oh) return jsonError('Open house not found', 404)
  return NextResponse.json({ data: oh })
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`open-houses.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.openHouse.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Open house not found', 404)

  const data: Record<string, unknown> = {}
  if (body.date !== undefined) data.date = new Date(body.date as string)
  if (body.startTime !== undefined) data.startTime = body.startTime
  if (body.endTime !== undefined) data.endTime = body.endTime
  if (body.notes !== undefined) data.notes = body.notes
  if (body.status !== undefined) data.status = body.status
  if (body.hostAgentId !== undefined) data.hostAgentId = body.hostAgentId

  const oh = await prisma.openHouse.update({ where: { id }, data, include: ohInclude })
  await logAudit({ scope, action: 'update', entity: 'openHouse', entityId: id })
  publishEntityUpdated(scope.organizationId, 'openHouse', id, scope.userId)
  return NextResponse.json({ data: oh })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`open-houses.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.openHouse.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Open house not found', 404)

  await prisma.openHouse.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'openHouse', entityId: id })
  publishEntityDeleted(scope.organizationId, 'openHouse', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
