/* GET  /api/market-data — market snapshots by zip code
   POST /api/market-data — add market data */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const zipCode = url.searchParams.get('zipCode') ?? undefined
  const year = url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!) : new Date().getFullYear()

  const prisma = getAuthPrisma()
  const data = await prisma.marketSnapshot.findMany({
    where: {
      organizationId: scope.organizationId,
      year,
      ...(zipCode ? { zipCode } : {}),
    },
    orderBy: [{ year: 'asc' }, { month: 'asc' }],
  })

  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.zipCode) return jsonError('zipCode is required', 400)
  if (!body.month || !body.year) return jsonError('month and year are required', 400)

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
