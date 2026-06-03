/* PATCH  /api/kanban/cards/[id] — update / move a card
   DELETE /api/kanban/cards/[id] — delete a card */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  columnId: z.string().optional(),
  title: z.string().trim().max(255).optional(),
  description: z.string().max(20000).optional(),
  priority: z.string().max(40).optional(),
  dueDate: z.union([z.string(), z.null()]).optional(),
  assigneeId: z.union([z.string(), z.null()]).optional(),
  projectId: z.union([z.string(), z.null()]).optional(),
  position: z.coerce.number().optional(),
})

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`kanban.cards.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const input = await parseBody(req, patchSchema)
  if (input instanceof NextResponse) return input

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
  if (input.title !== undefined) data.title = input.title
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

  const limited = enforceRateLimit(`kanban.cards.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

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
