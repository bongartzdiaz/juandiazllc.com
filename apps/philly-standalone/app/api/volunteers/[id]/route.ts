/* GET/PATCH/DELETE /api/volunteers/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const volunteer = await prisma.volunteer.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: { volunteerLogs: { orderBy: { date: 'desc' }, take: 20 } },
  })
  if (!volunteer) return jsonError('Volunteer not found', 404)
  return NextResponse.json({ data: volunteer })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`volunteers.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.volunteer.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Volunteer not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = ['name', 'email', 'phone', 'skills', 'status', 'totalHours'] as const
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }

  const volunteer = await prisma.volunteer.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'volunteer', entityId: id })
  publishEntityUpdated(scope.organizationId, 'volunteer', id, scope.userId)
  return NextResponse.json({ data: volunteer })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`volunteers.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.volunteer.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Volunteer not found', 404)

  await prisma.volunteer.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'volunteer', entityId: id })
  publishEntityDeleted(scope.organizationId, 'volunteer', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
