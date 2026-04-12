/* GET  /api/templates — list templates
   POST /api/templates — create template */

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
  const type = url.searchParams.get('type') ?? undefined

  const prisma = getAuthPrisma()
  const templates = await prisma.template.findMany({
    where: {
      organizationId: scope.organizationId,
      ...(type ? { type } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: templates })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: { name?: string; type?: string; subject?: string; body?: string; variables?: string[] }
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  if (!body.name?.trim()) return jsonError('name is required', 400)
  if (!body.type) return jsonError('type is required', 400)
  if (!body.body) return jsonError('body is required', 400)

  const prisma = getAuthPrisma()
  const template = await prisma.template.create({
    data: {
      organizationId: scope.organizationId,
      name: body.name.trim(),
      type: body.type,
      subject: body.subject ?? '',
      body: body.body,
      variables: JSON.stringify(body.variables ?? []),
    },
  })

  await logAudit({ scope, action: 'create', entity: 'template', entityId: template.id })
  return NextResponse.json({ data: template }, { status: 201 })
}
