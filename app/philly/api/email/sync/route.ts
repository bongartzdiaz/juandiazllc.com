/* POST /api/email/sync?accountId=...
   Pull new messages from Gmail for the given EmailAccount. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { enforceRateLimit } from '@/lib/philly/rate-limit'
import { syncGmailAccount } from '@/lib/philly/email/gmail-sync'
import { logger } from '@/lib/philly/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Sync is expensive (Gmail API round-trips + DB upserts). Keep it tight:
// ~6/min burst, 0.1/sec refill. Operators shouldn't need more than a
// manual "sync now" per few minutes — background worker will handle the rest.
const SYNC_LIMIT = { capacity: 6, refillPerSec: 0.1 } as const

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`email-sync:${scope.userId}`, SYNC_LIMIT)
  if (limited) return limited

  const url = new URL(req.url)
  const accountId = url.searchParams.get('accountId')
  if (!accountId) return jsonError('accountId is required', 400)

  const prisma = getAuthPrisma()
  const account = await prisma.emailAccount.findUnique({
    where: { id: accountId },
    select: { id: true, organizationId: true, provider: true, syncEnabled: true },
  })
  if (!account || account.organizationId !== scope.organizationId) {
    return jsonError('not found', 404)
  }
  if (account.provider !== 'gmail' && account.provider !== 'google') {
    return jsonError('only gmail accounts can sync (for now)', 400)
  }
  if (!account.syncEnabled) {
    return jsonError('sync is disabled for this account', 400)
  }

  try {
    const result = await syncGmailAccount(accountId)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[api/email/sync] failed', { accountId, err: message })
    return jsonError(message, 500)
  }
}
