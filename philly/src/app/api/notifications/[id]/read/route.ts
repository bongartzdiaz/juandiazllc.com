/* PATCH /api/notifications/[id]/read — mark single notification as read */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, jsonError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const notif = await prisma.notification.findFirst({
    where: { id, userId: scope.userId },
    select: { id: true },
  })
  if (!notif) return jsonError('Not found', 404)

  const updated = await prisma.notification.update({ where: { id }, data: { read: true } })
  return NextResponse.json({ data: updated })
}
