/* GET /api/me — current user + organization summary
   Used by the client to bootstrap the session-aware UI without
   re-fetching from /api/auth/session (which only carries JWT claims). */

import { NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, jsonError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()

  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      locale: true,
      avatarUrl: true,
      createdAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          industry: true,
          logoUrl: true,
        },
      },
    },
  })

  if (!user) return jsonError('User not found', 404)

  return NextResponse.json({ data: user })
}
