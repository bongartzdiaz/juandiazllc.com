/* GET  /api/documents — list documents (filterable by entity)
   POST /api/documents — upload document metadata */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
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
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: {
    name?: string; type?: string; mimeType?: string; sizeBytes?: number
    url?: string; entityType?: string; entityId?: string
  }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.name?.trim()) return jsonError('name is required', 400)
  if (!body.url?.trim()) return jsonError('url is required', 400)

  const prisma = getAuthPrisma()
  const doc = await prisma.document.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      type: body.type ?? 'file',
      mimeType: body.mimeType ?? '',
      sizeBytes: body.sizeBytes ?? 0,
      url: body.url.trim(),
      entityType: body.entityType ?? null,
      entityId: body.entityId ?? null,
      uploadedBy: scope.userId,
    },
  })

  publishEntityCreated(scope.organizationId, 'document', doc.id, scope.userId)
  return NextResponse.json({ data: doc }, { status: 201 })
}
