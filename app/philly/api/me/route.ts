/* GET   /api/me — current user + organization summary
   PATCH /api/me — update own profile (name, email, locale, avatarUrl)

   GET is used by the client to bootstrap the session-aware UI without
   re-fetching from /api/auth/session (which only carries JWT claims). */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit, diffChanges } from '@/lib/philly/audit'
import { serverError } from '@/lib/philly/safe-error'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ME_SELECT = {
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
} as const

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()

  const user = await prisma.user.findUnique({
    where: { id: scope.userId },
    select: ME_SELECT,
  })

  if (!user) return jsonError('User not found', 404)

  return NextResponse.json({ data: user })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.email === 'string' && body.email.trim()) {
    const email = body.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError('Invalid email', 400)
    data.email = email
  }
  if (typeof body.locale === 'string' && ['en', 'nl'].includes(body.locale)) data.locale = body.locale
  if (typeof body.avatarUrl === 'string') data.avatarUrl = body.avatarUrl.trim() || null

  if (Object.keys(data).length === 0) return jsonError('No valid fields to update', 400)

  try {
    const prisma = getAuthPrisma()
    const before = await prisma.user.findUnique({
      where: { id: scope.userId },
      select: { name: true, email: true, locale: true, avatarUrl: true },
    })
    const user = await prisma.user.update({
      where: { id: scope.userId },
      data,
      select: ME_SELECT,
    })
    await logAudit({
      scope, action: 'update', entity: 'user', entityId: user.id,
      changes: diffChanges((before ?? {}) as Record<string, unknown>, data),
    })
    return NextResponse.json({ data: user })
  } catch (err) {
    return serverError(err, 'Failed to update profile', 400)
  }
}
