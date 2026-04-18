/* GET /api/kanban/boards — list all boards in the user's org with
   their columns and cards. Lightweight payload meant for the kanban
   page initial fetch. */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const boards = await prisma.kanbanBoard.findMany({
    where: { organizationId: scope.organizationId },
    orderBy: { createdAt: 'asc' },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: { select: { id: true, name: true, avatarUrl: true } },
              project: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  })

  return NextResponse.json({ data: boards })
}
