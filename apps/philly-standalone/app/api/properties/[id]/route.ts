/* GET/PATCH/DELETE /api/properties/[id] */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const patchSchema = z.object({
  title: z.string().max(255).optional(),
  type: z.string().max(60).optional(),
  status: z.string().max(60).optional(),
  address: z.string().max(255).optional(),
  city: z.string().max(120).optional(),
  state: z.string().max(120).optional(),
  zipCode: z.string().max(40).optional(),
  country: z.string().max(120).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  priceCents: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  sqft: z.number().optional(),
  yearBuilt: z.number().optional(),
  description: z.string().max(10000).optional(),
  features: z.any().optional(),
  images: z.any().optional(),
  mlsNumber: z.string().max(120).optional(),
  hoaCents: z.number().optional(),
  listingDate: z.string().nullable().optional(),
  expirationDate: z.string().nullable().optional(),
})

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

  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

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
