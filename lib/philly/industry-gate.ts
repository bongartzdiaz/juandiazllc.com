/* ---------------------------------------------------------------
   Industry-gating helper for vertical-specific page routes.

   Some DEUS modules are vertical-specific (e.g. grants is
   philanthropy-only). The sidebar already hides them per industry,
   but URL-pasting a hidden module would still load the page if not
   gated server-side. This helper closes that gap.

   Use in a server-side `layout.tsx`:

     export default async function PhilanthropyOnlyLayout({ children }) {
       await requireIndustry(['philanthropy', 'general'])
       return <>{children}</>
     }

   Authoritative source for industry is Organization.industry in the
   DB — NOT the localStorage-backed useIndustry() client hook, which
   is a UI preference and not a security boundary.
   --------------------------------------------------------------- */

import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { requireScope } from './auth-helpers'
import { getAuthPrisma } from './auth'

/**
 * Gates a page on the caller's organization industry. Redirects to
 * /philly when the industry doesn't match. Throws (via redirect) on
 * a missing session — the 401 from requireScope is converted into a
 * client-side redirect to /login.
 *
 * Pass the list of industries that ARE allowed to see the page.
 * Anything else (including future industries we haven't shipped) is
 * rejected by default.
 */
export async function requireIndustry(allowed: ReadonlyArray<string>): Promise<void> {
  const scope = await requireScope()
  if (scope instanceof NextResponse) {
    // Not authenticated — let the standard auth flow handle it.
    redirect('/login')
  }

  const prisma = getAuthPrisma()
  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: { industry: true, deletedAt: true },
  })

  if (!org || org.deletedAt) {
    redirect('/login')
  }

  if (!allowed.includes(org.industry)) {
    // 404-equivalent: bounce to the dashboard home. We deliberately
    // don't render a "you don't have access" message — it would leak
    // existence of the module to users whose org doesn't have it.
    redirect('/philly')
  }
}
