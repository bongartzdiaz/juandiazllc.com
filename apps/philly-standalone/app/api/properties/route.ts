/* GET  /api/properties — list properties (paginated)
   POST /api/properties — create property */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { createPropertySchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireSection('properties')
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)

  // Single-property fetch via ?id=...
  const singleId = url.searchParams.get('id')
  if (singleId) {
    const prisma = getAuthPrisma()
    const prop = await prisma.property.findFirst({
      where: { id: singleId, organizationId: scope.organizationId },
      include: { _count: { select: { viewings: true } } },
    })
    if (!prop) return jsonError('Property not found', 404)
    return NextResponse.json({ data: prop })
  }

  const { page, limit, skip } = parsePagination(req)
  const status = url.searchParams.get('status') ?? undefined
  const type = url.searchParams.get('type') ?? undefined
  const subtype = url.searchParams.get('subtype') ?? undefined
  const listingType = url.searchParams.get('listingType') ?? undefined
  const district = url.searchParams.get('district') ?? undefined
  const bankOwned = url.searchParams.get('bankOwned')
  const resale = url.searchParams.get('resale')
  const search = url.searchParams.get('q') ?? undefined

  const prisma = getAuthPrisma()
  const where: any = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(subtype ? { subtype } : {}),
    ...(listingType ? { listingType } : {}),
    ...(district ? { district } : {}),
    ...(bankOwned === 'true' ? { isBankOwned: true } : {}),
    ...(resale === 'true' ? { isResale: true } : {}),
    ...(search ? { OR: [
      { title: { contains: search } },
      { address: { contains: search } },
      { city: { contains: search } },
      { town: { contains: search } },
    ] } : {}),
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: limit,
      include: { _count: { select: { viewings: true } } },
    }),
    prisma.property.count({ where }),
  ])

  return paginatedResponse(properties, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('properties', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`properties.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, createPropertySchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const prop = await prisma.property.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title,
      type: body.type,
      status: body.status,
      address: body.address,
      city: body.city,
      state: body.state,
      zipCode: body.zipCode,
      country: body.country,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      priceCents: body.priceCents,
      bedrooms: body.bedrooms ?? null,
      bathrooms: body.bathrooms ?? null,
      sqft: body.sqft ?? null,
      yearBuilt: body.yearBuilt ?? null,
      description: body.description,
      features: JSON.stringify(body.features),
      images: JSON.stringify(body.images),
      // DEUS fields
      listingType: body.listingType,
      subtype: body.subtype,
      district: body.district,
      town: body.town,
      isBankOwned: body.isBankOwned,
      isResale: body.isResale,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'property', entityId: prop.id })
  publishEntityCreated(scope.organizationId, 'property', prop.id, scope.userId)
  return NextResponse.json({ data: prop }, { status: 201 })
}
