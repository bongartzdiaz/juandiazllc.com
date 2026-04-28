/* POST /api/me/active-org — switch the caller's active org.

   Body: { organizationId: string }

   Verifies the caller has a Membership in the requested org, then
   sets the `philly-active-org` cookie. Subsequent requests resolve
   their permissions against THAT org until they switch again or
   sign out.

   Returns 200 + the new active scope summary on success, 403 if
   the caller isn't a member of the requested org. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { cookies } from 'next/headers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError, ACTIVE_ORG_COOKIE } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const switchSchema = z.object({
  organizationId: z.string().min(1).max(60),
})

export async function POST(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`active-org:switch:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, switchSchema)
  if (!parsed.success) return parsed.response
  const target = parsed.data.organizationId

  // The user's own home org is always valid. Switching back to it
  // = clearing the cookie (so requireScope's fall-back path picks up).
  const prisma = getAuthPrisma()
  const home = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: { organizationId: true },
  })
  const isHome = home?.organizationId === target
  if (!isHome) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: scope.userId, organizationId: target } },
      select: { id: true },
    })
    if (!membership) return jsonError('Not a member of that organization', 403)
  }

  const cookieJar = await cookies()
  if (isHome) {
    cookieJar.delete(ACTIVE_ORG_COOKIE)
  } else {
    cookieJar.set(ACTIVE_ORG_COOKIE, target, {
      // The active-org pointer isn't a session credential — it's a
      // user preference. httpOnly so the dashboard server reads it
      // but client JS doesn't need to; sameSite=lax so it survives
      // navigations from the dashboard's own pages; max-age 30 days.
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    })
  }

  return NextResponse.json({ activeOrganizationId: target })
}
