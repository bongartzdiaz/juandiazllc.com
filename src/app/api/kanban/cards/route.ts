/* POST /api/kanban/cards — create a new card in a column the user owns */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { validateBody } from '@/lib/validation'
import { createKanbanCardSchema } from '@/lib/validation/schemas'
import { logAudit } from '@/lib/audit'
import { publishEntityCreated } from '@/lib/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createKanbanCardSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  // Verify the target column belongs to a board in the user's org
  const column = await prisma.kanbanColumn.findFirst({
    where: {
      id: input.columnId,
      board: { organizationId: scope.organizationId },
    },
    select: { id: true, _count: { select: { cards: true } } },
  })
  if (!column) return jsonError('Column not found', 404)

  const card = await prisma.kanbanCard.create({
    data: {
      columnId: input.columnId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeId: input.assigneeId,
      projectId: input.projectId,
      position: column._count.cards, // append to end
    },
  })

  await logAudit({ scope, action: 'create', entity: 'kanbanCard', entityId: card.id })
  publishEntityCreated(scope.organizationId, 'kanbanCard', card.id, scope.userId)

  return NextResponse.json({ data: card }, { status: 201 })
}
