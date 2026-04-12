/* GET  /api/properties — list properties (paginated)
   POST /api/properties — create property */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? undefined
  const type = url.searchParams.get('type') ?? undefined
  const search = url.searchParams.get('q') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
    ...(search ? { OR: [{ title: { contains: search } }, { address: { contains: search } }, { city: { contains: search } }] } : {}),
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
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.title?.trim()) return jsonError('title is required', 400)

  const prisma = getAuthPrisma()
  const prop = await prisma.property.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title.trim(),
      type: body.type ?? 'residential',
      status: body.status ?? 'available',
      address: body.address ?? '',
      city: body.city ?? '',
      state: body.state ?? '',
      zipCode: body.zipCode ?? '',
      country: body.country ?? '',
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      priceCents: body.priceCents ?? 0,
      bedrooms: body.bedrooms ?? null,
      bathrooms: body.bathrooms ?? null,
      sqft: body.sqft ?? null,
      yearBuilt: body.yearBuilt ?? null,
      description: body.description ?? '',
      features: body.features ? JSON.stringify(body.features) : '[]',
      images: body.images ? JSON.stringify(body.images) : '[]',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'project' as any, entityId: prop.id })
  return NextResponse.json({ data: prop }, { status: 201 })
}
