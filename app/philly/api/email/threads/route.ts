/* GET /api/email/threads — list email threads for the current org.
   Filters: accountId, contactId, unread, limit (1-100), cursor. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { enforceRateLimit, PRESET_READ } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`email-threads:${scope.userId}`, PRESET_READ)
  if (limited) return limited

  const url = new URL(req.url)
  const accountId = url.searchParams.get('accountId') ?? undefined
  const contactId = url.searchParams.get('contactId') ?? undefined
  const onlyUnread = url.searchParams.get('unread') === '1'
  const limitParam = Number(url.searchParams.get('limit') ?? '25')
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, Math.floor(limitParam))) : 25
  const cursor = url.searchParams.get('cursor') ?? undefined

  const prisma = getAuthPrisma()
  const threads = await prisma.emailThread.findMany({
    where: {
      account: { organizationId: scope.organizationId },
      ...(accountId ? { accountId } : {}),
      ...(contactId ? { contactId } : {}),
      ...(onlyUnread ? { unreadCount: { gt: 0 } } : {}),
    },
    orderBy: { lastMessageAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: {
      id: true,
      accountId: true,
      providerThreadId: true,
      contactId: true,
      subject: true,
      snippet: true,
      participants: true,
      messageCount: true,
      unreadCount: true,
      lastMessageAt: true,
      labels: true,
    },
  })

  let nextCursor: string | null = null
  if (threads.length > limit) {
    nextCursor = threads[limit - 1].id
    threads.length = limit
  }

  return NextResponse.json({
    threads: threads.map((t) => ({
      ...t,
      participants: safeJsonArray(t.participants),
      labels: safeJsonArray(t.labels),
    })),
    nextCursor,
  })
}

function safeJsonArray(s: string): string[] {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}
