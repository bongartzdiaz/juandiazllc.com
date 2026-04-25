/* GET    /api/assistant/conversations/[id] — fetch full thread
   DELETE /api/assistant/conversations/[id] — delete the conversation
                                              (cascade-deletes turns) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const conv = await prisma.assistantConversation.findFirst({
    where: { id, organizationId: scope.organizationId, userId: scope.userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      turns: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          role: true,
          content: true,
          retrievedDocs: true,
          createdAt: true,
        },
      },
    },
  })
  if (!conv) return jsonError('Conversation not found', 404)
  return NextResponse.json({ data: conv })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  // Tenant-scoped check before delete: refuse to touch a conversation
  // owned by another user or org, even if the id is correct.
  const existing = await prisma.assistantConversation.findFirst({
    where: { id, organizationId: scope.organizationId, userId: scope.userId },
    select: { id: true },
  })
  if (!existing) return jsonError('Conversation not found', 404)
  await prisma.assistantConversation.delete({ where: { id } })
  return NextResponse.json({ data: { id } })
}
