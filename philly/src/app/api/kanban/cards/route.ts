/* POST /api/kanban/cards — create a new card in a column the user owns */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as {
    columnId?: string
    title?: string
    description?: string
    priority?: string
    dueDate?: string | null
    assigneeId?: string | null
    projectId?: string | null
  }

  if (!input.columnId) return jsonError('columnId is required', 400)
  if (!input.title?.trim()) return jsonError('title is required', 400)

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

  let dueDate: Date | null = null
  if (input.dueDate) {
    const d = new Date(input.dueDate)
    if (isNaN(d.getTime())) return jsonError('dueDate must be a valid date', 400)
    dueDate = d
  }

  const card = await prisma.kanbanCard.create({
    data: {
      columnId: input.columnId,
      title: input.title.trim(),
      description: input.description ?? '',
      priority: input.priority ?? 'medium',
      dueDate,
      assigneeId: input.assigneeId ?? null,
      projectId: input.projectId ?? null,
      position: column._count.cards, // append to end
    },
  })

  return NextResponse.json({ data: card }, { status: 201 })
}
