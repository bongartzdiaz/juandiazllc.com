/* GET  /api/api-keys — list keys (metadata only)
   POST /api/api-keys — create a new key (returns raw once) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { generateApiKey } from '@/lib/philly/api-keys'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(120),
  permissions: z.string().optional(),
  expiresInDays: z.coerce.number().optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }
  const [keys, total] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: { id: true, name: true, prefix: true, permissions: true, lastUsedAt: true, expiresAt: true, createdAt: true },
    }),
    prisma.apiKey.count({ where }),
  ])
  return paginatedResponse(keys, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`api-keys.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const permissions = (body.permissions === 'write' || body.permissions === 'admin') ? body.permissions : 'read'

  const { raw, hash, prefix } = generateApiKey()
  const expiresAt = body.expiresInDays && body.expiresInDays > 0
    ? new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000)
    : null

  const prisma = getAuthPrisma()
  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      keyHash: hash,
      prefix,
      permissions,
      expiresAt,
    },
    select: { id: true, name: true, prefix: true, permissions: true, expiresAt: true, createdAt: true },
  })

  await logAudit({ scope, action: 'create', entity: 'apiKey', entityId: apiKey.id })

  return NextResponse.json({
    data: {
      ...apiKey,
      key: raw, // returned ONCE
      warning: 'Copy this key now — it will not be shown again.',
    },
  }, { status: 201 })
}
