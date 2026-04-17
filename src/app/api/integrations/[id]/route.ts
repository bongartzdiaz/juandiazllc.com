/* DELETE /api/integrations/[id] — revoke & remove an integration
   Fully clears stored tokens and deletes the integration record.
   For OAuth providers, best-effort calls the provider's revoke endpoint first. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

// Best-effort OAuth revoke URLs per provider
const REVOKE_URLS: Record<string, (token: string) => { url: string; init: RequestInit }> = {
  google: (token) => ({
    url: `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
    init: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  }),
  microsoft: (token) => ({
    // Microsoft doesn't have a simple revoke endpoint; token invalidation happens via user logout.
    // We just best-effort mark as revoked client-side.
    url: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
    init: { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } },
  }),
  slack: (token) => ({
    url: 'https://slack.com/api/auth.revoke',
    init: {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  }),
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const existing = await prisma.integration.findFirst({
    where: { id, organizationId: scope.organizationId },
  })
  if (!existing) return jsonError('Integration not found', 404)

  // Best-effort token revoke with the provider (no-throw)
  if (existing.accessToken && REVOKE_URLS[existing.provider]) {
    try {
      const r = REVOKE_URLS[existing.provider](existing.accessToken)
      await fetch(r.url, r.init).catch(() => {})
    } catch { /* ignore */ }
  }

  await prisma.integration.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'integration', entityId: id })
  return new NextResponse(null, { status: 204 })
}
