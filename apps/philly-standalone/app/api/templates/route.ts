/* GET  /api/templates — list templates
   POST /api/templates — create template */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { validateBody } from '@/lib/philly/validation'
import { createTemplateSchema } from '@/lib/philly/validation/schemas'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? undefined

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = {
    organizationId: scope.organizationId,
    ...(type ? { type } : {}),
  }
  const [templates, total] = await Promise.all([
    prisma.template.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.template.count({ where }),
  ])

  return paginatedResponse(templates, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`templates.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const parsed = await validateBody(req, createTemplateSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  const prisma = getAuthPrisma()
  const template = await prisma.template.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name,
      type: body.type,
      subject: body.subject,
      body: body.body,
      variables: JSON.stringify(body.variables),
    },
  })

  await logAudit({ scope, action: 'create', entity: 'template', entityId: template.id })
  publishEntityCreated(scope.organizationId, 'template', template.id, scope.userId, template)
  return NextResponse.json({ data: template }, { status: 201 })
}
