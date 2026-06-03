/* GET  /api/documents — list documents (filterable by entity)
   POST /api/documents — upload document metadata */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSection } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  name: z.string().trim().min(1, 'name is required').max(255),
  url: z.string().trim().min(1, 'url is required').max(2_000),
  type: z.string().trim().max(40).optional(),
  mimeType: z.string().trim().max(120).optional(),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  entityType: z.string().trim().max(40).optional(),
  entityId: z.string().trim().max(80).optional(),
})

export async function GET(req: NextRequest) {
  const scope = await requireSection('documents')
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const entityType = url.searchParams.get('entityType') ?? undefined
  const entityId = url.searchParams.get('entityId') ?? undefined

  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
  }

  const [docs, total] = await Promise.all([
    prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.document.count({ where }),
  ])

  return paginatedResponse(docs, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireSection('documents', ['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`documents.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const doc = await prisma.document.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      type: body.type ?? 'file',
      mimeType: body.mimeType ?? '',
      sizeBytes: body.sizeBytes ?? 0,
      url: body.url,
      entityType: body.entityType ?? null,
      entityId: body.entityId ?? null,
      uploadedBy: scope.userId,
    },
  })

  publishEntityCreated(scope.organizationId, 'document', doc.id, scope.userId)
  return NextResponse.json({ data: doc }, { status: 201 })
}
