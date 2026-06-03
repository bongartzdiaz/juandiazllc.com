/* GET/PATCH/DELETE /api/rooms/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const updateSchema = z.object({
  name: z.string().trim().max(120).optional(),
  type: z.string().trim().max(60).optional(),
  status: z.string().trim().max(60).optional(),
  floor: z.coerce.number().optional(),
  capacity: z.coerce.number().optional(),
  priceCentsNight: z.coerce.number().optional(),
  amenities: z.any().optional(),
  images: z.any().optional(),
})

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const room = await prisma.room.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!room) return jsonError('Room not found', 404)
  return NextResponse.json({ data: room })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`rooms.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const body = await parseBody(req, updateSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.room.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Room not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = ['name', 'type', 'status', 'floor', 'capacity', 'priceCentsNight', 'amenities', 'images'] as const
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const room = await prisma.room.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'room', entityId: id })
  publishEntityUpdated(scope.organizationId, 'room', id, scope.userId)
  return NextResponse.json({ data: room })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`rooms.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.room.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Room not found', 404)

  await prisma.room.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'room', entityId: id })
  publishEntityDeleted(scope.organizationId, 'room', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
