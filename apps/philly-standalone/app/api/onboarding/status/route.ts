/* GET /api/onboarding/status — does the signed-in Supabase user
   need onboarding (no Philly row), and is there a pending
   admin-led invite waiting on their email? */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSupabaseUser } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const subject = await requireSupabaseUser()
  if (subject instanceof NextResponse) return subject

  const prisma = getAuthPrisma()
  const user = await prisma.user.findUnique({
    where: { email: subject.email },
    select: { id: true, organizationId: true, role: true },
  })

  if (user) {
    return NextResponse.json({
      needsOnboarding: false,
      organizationId: user.organizationId,
      role: user.role,
    })
  }

  return NextResponse.json({
    needsOnboarding: true,
    email: subject.email,
  })
}
