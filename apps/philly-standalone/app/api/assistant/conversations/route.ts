/* GET /api/assistant/conversations — list the caller's conversations
   (newest first). Used by the chat UI sidebar. */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const conversations = await prisma.assistantConversation.findMany({
    where: { organizationId: scope.organizationId, userId: scope.userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { turns: true } },
    },
  })
  return NextResponse.json({ conversations })
}
