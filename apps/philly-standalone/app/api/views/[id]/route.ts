/* PATCH /api/views/[id] — rename / toggle shared / update payload
   DELETE /api/views/[id] — owner-only delete */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, jsonError } from '@/lib/philly/auth-helpers'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`views:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  let body: {
    name?: string
    filtersJson?: string
    columnsJson?: string
    sortJson?: string
    isShared?: boolean
    isDefault?: boolean
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  // Owner-or-admin tenancy check. Shared views can only be edited by
  // their original creator unless the caller is an admin/manager.
  const existing = await prisma.savedView.findFirst({
    where: {
      id,
      organizationId: scope.organizationId,
      OR: [
        { userId: scope.userId },
        ...(scope.role === 'admin' || scope.role === 'manager' ? [{ isShared: true }] : []),
      ],
    },
    select: { id: true },
  })
  if (!existing) return jsonError('Saved view not found', 404)

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) {
    if (!body.name.trim()) return jsonError('name cannot be empty', 400)
    data.name = body.name.trim()
  }
  if (body.filtersJson !== undefined) data.filtersJson = body.filtersJson
  if (body.columnsJson !== undefined) data.columnsJson = body.columnsJson
  if (body.sortJson !== undefined) data.sortJson = body.sortJson
  if (body.isShared !== undefined) data.isShared = body.isShared
  if (body.isDefault !== undefined) data.isDefault = body.isDefault

  if (Object.keys(data).length === 0) return jsonError('No editable fields supplied', 400)

  const view = await prisma.savedView.update({ where: { id }, data })
  return NextResponse.json({ data: view })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`views:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  // Strictly owner-delete — admins can't ghost-delete a colleague's
  // private view. (Shared views are deletable by their creator OR by
  // any admin/manager.)
  const existing = await prisma.savedView.findFirst({
    where: {
      id,
      organizationId: scope.organizationId,
      OR: [
        { userId: scope.userId },
        ...(scope.role === 'admin' || scope.role === 'manager' ? [{ isShared: true }] : []),
      ],
    },
    select: { id: true },
  })
  if (!existing) return jsonError('Saved view not found', 404)

  await prisma.savedView.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
