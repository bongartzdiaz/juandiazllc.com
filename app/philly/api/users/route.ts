/* ---------------------------------------------------------------
   /api/users — admin user management.
   - GET: list users in the caller's organization
   - PATCH: update a user's role (admin only)
   --------------------------------------------------------------- */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logAudit } from '@/lib/philly/audit'

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const users = await prisma.user.findMany({
    where: { organizationId: scope.organizationId },
    select: {
      id: true, email: true, name: true, role: true,
      avatarUrl: true, lastLoginAt: true, createdAt: true,
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json({ users })
}

const patchSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['admin', 'manager', 'viewer']),
})

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid payload', 400)
  }

  const prisma = getAuthPrisma()
  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, role: true, organizationId: true },
  })
  if (!target) return jsonError('User not found', 404)
  if (target.organizationId !== scope.organizationId) {
    return jsonError('Cross-organization update not allowed', 403)
  }

  // Guardrail: can't demote the last admin
  if (target.role === 'admin' && parsed.data.role !== 'admin') {
    const adminCount = await prisma.user.count({
      where: { organizationId: scope.organizationId, role: 'admin' },
    })
    if (adminCount <= 1) {
      return jsonError('Cannot demote the last admin', 400)
    }
  }

  const updated = await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  })

  await logAudit({
    scope,
    action: 'update',
    entity: 'user',
    entityId: target.id,
    changes: { role: { from: target.role, to: parsed.data.role } },
  }).catch(() => { /* audit best-effort */ })

  return NextResponse.json({ user: updated })
}
