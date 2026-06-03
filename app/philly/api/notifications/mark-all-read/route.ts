/* POST /api/notifications/mark-all-read — mark all as read */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  // org-scope-lint-ok: Notification rows are per-user; scoped to the caller's own userId (tighter than org)
  const result = await prisma.notification.updateMany({
    where: { userId: scope.userId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ data: { updated: result.count } })
}
