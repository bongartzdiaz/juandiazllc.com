/* GET  /api/mls-feeds — list MLS feed configs
   POST /api/mls-feeds — create new feed config */

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

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  provider: z.string().max(60).optional(),
  apiUrl: z.string().max(2000).optional(),
  apiKey: z.string().max(2000).optional(),
  syncInterval: z.number().optional(),
  status: z.string().max(60).optional(),
})

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

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const feed = await prisma.mlsFeed.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
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
