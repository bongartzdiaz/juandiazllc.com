/* POST /api/notifications/mark-all-read — mark all as read */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope } from '@/lib/philly/auth-helpers'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`notifications.mark-all-read:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const prisma = getAuthPrisma()
  // Belt-and-braces: scope by org as well as user so the updateMany
  // can never escape the caller's tenant even if userId↔org mapping
  // were ever corrupted.
  const result = await prisma.notification.updateMany({
    where: { userId: scope.userId, organizationId: scope.organizationId, read: false },
    data: { read: true },
  })

  return NextResponse.json({ data: { updated: result.count } })
}
