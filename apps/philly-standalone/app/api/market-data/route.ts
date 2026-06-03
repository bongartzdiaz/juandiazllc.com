/* GET  /api/market-data — market snapshots by zip code
   POST /api/market-data — add market data */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const upsertSchema = z.object({
  zipCode: z.string().trim().min(1, 'zipCode is required').max(40),
  month: z.number().int().positive('month and year are required'),
  year: z.number().int().positive('month and year are required'),
  medianPriceCents: z.number().optional(),
  avgDaysOnMarket: z.number().optional(),
  activeListings: z.number().optional(),
  closedSales: z.number().optional(),
  newListings: z.number().optional(),
  avgPricePerSqft: z.number().optional(),
  inventoryMonths: z.number().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const zipCode = url.searchParams.get('zipCode') ?? undefined
  const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : new Date().getFullYear()

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    year,
    ...(zipCode ? { zipCode } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.marketSnapshot.findMany({
      where,
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.marketSnapshot.count({ where }),
  ])

  return paginatedResponse(data, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`market-data.upsert:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, upsertSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const snapshot = await prisma.marketSnapshot.upsert({
    where: {
      organizationId_zipCode_year_month: {
        organizationId: scope.organizationId,
        zipCode: body.zipCode,
        year: body.year,
        month: body.month,
      },
    },
    create: {
      organizationId: scope.organizationId,
      zipCode: body.zipCode,
      year: body.year,
      month: body.month,
      medianPriceCents: body.medianPriceCents ?? 0,
      avgDaysOnMarket: body.avgDaysOnMarket ?? 0,
      activeListings: body.activeListings ?? 0,
      closedSales: body.closedSales ?? 0,
      newListings: body.newListings ?? 0,
      avgPricePerSqft: body.avgPricePerSqft ?? 0,
      inventoryMonths: body.inventoryMonths ?? 0,
    },
    update: {
      medianPriceCents: body.medianPriceCents,
      avgDaysOnMarket: body.avgDaysOnMarket,
      activeListings: body.activeListings,
      closedSales: body.closedSales,
      newListings: body.newListings,
      avgPricePerSqft: body.avgPricePerSqft,
      inventoryMonths: body.inventoryMonths,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'marketSnapshot', entityId: snapshot.id })
  return NextResponse.json({ data: snapshot })
}
