/* GET /api/admin/orgs
   ──────────────────────────────────────────────────────────────────
   Super-admin-only list of every Organization in the system, with a
   small per-org summary the UI needs for the org-list page:
     - id, name, slug, industry, createdAt
     - subscription.plan (or null if no Subscription row — demo tenants)
     - count of OrgFeatureOverride rows (so the UI can show "3 active
       overrides" badge without a separate fetch)

   Supports ?q=… free-text search (matches name OR slug, case-insensitive
   via Prisma's `contains`/`mode: 'insensitive'`).
   Supports ?limit=N&offset=M for pagination (default 50 / 0).

   PR-3/4. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSuperAdmin, jsonError } from '@/lib/philly/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

export async function GET(req: NextRequest) {
  const scope = await requireSuperAdmin()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get('limit') ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  )
  const offset = Math.max(parseInt(url.searchParams.get('offset') ?? '0', 10) || 0, 0)

  const prisma = getAuthPrisma()

  const whereClause = q
    ? {
        OR: [
          { name: { contains: q } },
          { slug: { contains: q } },
        ],
      }
    : {}

  const [orgs, total] = await Promise.all([
    prisma.organization.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true } },
        _count: { select: { orgFeatureOverrides: true } },
      },
    }),
    prisma.organization.count({ where: whereClause }),
  ])

  return NextResponse.json({
    data: orgs.map(o => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      industry: o.industry,
      createdAt: o.createdAt,
      plan: o.subscription?.plan ?? null,
      subscriptionStatus: o.subscription?.status ?? null,
      overrideCount: o._count.orgFeatureOverrides,
    })),
    pagination: { total, limit, offset },
  })
}
