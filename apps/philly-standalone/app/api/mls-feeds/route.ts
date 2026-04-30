/* GET  /api/mls-feeds — list MLS feed configs
   POST /api/mls-feeds — create new feed config */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }

  const [feeds, total] = await Promise.all([
    prisma.mlsFeed.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.mlsFeed.count({ where }),
  ])

  return paginatedResponse(feeds, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`mls-feeds.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  let body: Record<string, any>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  if (!body.name?.trim()) return jsonError('name is required', 400)

  const prisma = getAuthPrisma()
  const feed = await prisma.mlsFeed.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      provider: body.provider ?? 'rets',
      apiUrl: body.apiUrl ?? '',
      apiKey: body.apiKey ?? '',
      syncInterval: body.syncInterval ?? 360,
      status: body.status ?? 'active',
    },
  })

  await logAudit({ scope, action: 'create', entity: 'mlsFeed', entityId: feed.id })
  return NextResponse.json({ data: feed }, { status: 201 })
}
