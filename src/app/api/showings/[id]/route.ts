/* PATCH /api/showings/[id] — update showing (status, feedback, rating) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.showing.findFirst({
    where: { id, property: { organizationId: scope.organizationId } },
    select: { id: true },
  })
  if (!existing) return jsonError('Showing not found', 404)

  const data: Record<string, unknown> = {}
  if (body.status !== undefined) data.status = body.status
  if (body.feedback !== undefined) data.feedback = body.feedback
  if (body.rating !== undefined) data.rating = Math.min(5, Math.max(1, body.rating))
  if (body.notes !== undefined) data.notes = body.notes
  if (body.date !== undefined) data.date = new Date(body.date)

  const showing = await prisma.showing.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'calendarEvent' as any, entityId: id })
  return NextResponse.json({ data: showing })
}
