/* PATCH  /api/kanban/cards/[id] — update / move a card
   DELETE /api/kanban/cards/[id] — delete a card */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit, diffChanges } from '@/lib/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as Partial<{
    columnId: string
    title: string
    description: string
    priority: string
    dueDate: string | null
    assigneeId: string | null
    projectId: string | null
    position: number
  }>

  const prisma = getAuthPrisma()

  // Org-scope check via the parent board
  const existing = await prisma.kanbanCard.findFirst({
    where: {
      id,
      column: { board: { organizationId: scope.organizationId } },
    },
  })
  if (!existing) return jsonError('Card not found', 404)

  // If moving to a new column, verify ownership of the target
  if (input.columnId !== undefined) {
    const target = await prisma.kanbanColumn.findFirst({
      where: {
        id: input.columnId,
        board: { organizationId: scope.organizationId },
      },
      select: { id: true },
    })
    if (!target) return jsonError('Target column not found', 404)
  }

  const data: Record<string, unknown> = {}
  if (input.columnId !== undefined) data.columnId = input.columnId
  if (input.title !== undefined) data.title = input.title.trim()
  if (input.description !== undefined) data.description = input.description
  if (input.priority !== undefined) data.priority = input.priority
  if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId
  if (input.projectId !== undefined) data.projectId = input.projectId
  if (input.position !== undefined) data.position = Math.max(0, Math.floor(input.position))
  if (input.dueDate !== undefined) {
    if (input.dueDate === null) {
      data.dueDate = null
    } else {
      const d = new Date(input.dueDate)
      if (isNaN(d.getTime())) return jsonError('dueDate must be a valid date', 400)
      data.dueDate = d
    }
  }

  const card = await prisma.kanbanCard.update({ where: { id }, data })

  const changes = diffChanges(existing as unknown as Record<string, unknown>, input as Record<string, unknown>)
  await logAudit({ scope, action: 'update', entity: 'kanbanCard', entityId: id, changes })
  publishEntityUpdated(scope.organizationId, 'kanbanCard', id, scope.userId)

  return NextResponse.json({ data: card })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.kanbanCard.findFirst({
    where: {
      id,
      column: { board: { organizationId: scope.organizationId } },
    },
    select: { id: true },
  })
  if (!existing) return jsonError('Card not found', 404)

  await prisma.kanbanCard.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'kanbanCard', entityId: id })
  publishEntityDeleted(scope.organizationId, 'kanbanCard', id, scope.userId)

  return new NextResponse(null, { status: 204 })
}
