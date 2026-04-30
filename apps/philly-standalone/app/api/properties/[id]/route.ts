/* GET/PATCH/DELETE /api/properties/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('properties')
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const property = await prisma.property.findFirst({
    where: { id, organizationId: scope.organizationId },
    include: {
      _count: { select: { viewings: true, showings: true, offers: true, openHouses: true } },
    },
  })
  if (!property) return jsonError('Property not found', 404)
  return NextResponse.json({ data: property })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('properties', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`properties.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const prisma = getAuthPrisma()
  const existing = await prisma.property.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Property not found', 404)

  const data: Record<string, unknown> = {}
  const allowed = [
    'title', 'type', 'status', 'address', 'city', 'state', 'zipCode', 'country',
    'lat', 'lng', 'priceCents', 'bedrooms', 'bathrooms', 'sqft', 'yearBuilt',
    'description', 'features', 'images', 'mlsNumber', 'hoaCents',
  ] as const
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key]
  }
  if (body.listingDate !== undefined) {
    data.listingDate = body.listingDate ? new Date(body.listingDate as string) : null
  }
  if (body.expirationDate !== undefined) {
    data.expirationDate = body.expirationDate ? new Date(body.expirationDate as string) : null
  }

  const property = await prisma.property.update({ where: { id }, data })
  await logAudit({ scope, action: 'update', entity: 'property', entityId: id })
  publishEntityUpdated(scope.organizationId, 'property', id, scope.userId)
  return NextResponse.json({ data: property })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSection('properties', ['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`properties.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()

  const existing = await prisma.property.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true },
  })
  if (!existing) return jsonError('Property not found', 404)

  await prisma.property.delete({ where: { id } })
  await logAudit({ scope, action: 'delete', entity: 'property', entityId: id })
  publishEntityDeleted(scope.organizationId, 'property', id, scope.userId)
  return new NextResponse(null, { status: 204 })
}
