/* GET   /api/organization — current org details
   PATCH /api/organization — update org (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'
import { logAudit, diffChanges } from '@/lib/audit'
import { publishEntityUpdated } from '@/lib/realtime/publish'
import { serverError } from '@/lib/safe-error'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  industry: true,
  logoUrl: true,
  createdAt: true,
} as const

const ALLOWED_INDUSTRIES = [
  'general', 'nonprofit', 'foundation', 'csr', 'government',
  'education', 'healthcare', 'realestate', 'hospitality',
]

export async function GET() {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const prisma = getAuthPrisma()
  const org = await prisma.organization.findUnique({
    where: { id: scope.organizationId },
    select: ORG_SELECT,
  })
  if (!org) return jsonError('Organization not found', 404)
  return NextResponse.json({ data: org })
}

export async function PATCH(req: NextRequest) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.industry === 'string') {
    if (!ALLOWED_INDUSTRIES.includes(body.industry)) {
      return jsonError(`Invalid industry; must be one of: ${ALLOWED_INDUSTRIES.join(', ')}`, 400)
    }
    data.industry = body.industry
  }
  if (typeof body.logoUrl === 'string') data.logoUrl = body.logoUrl.trim() || null

  if (Object.keys(data).length === 0) return jsonError('No valid fields to update', 400)

  try {
    const prisma = getAuthPrisma()
    const before = await prisma.organization.findUnique({
      where: { id: scope.organizationId },
      select: { name: true, industry: true, logoUrl: true },
    })
    const org = await prisma.organization.update({
      where: { id: scope.organizationId },
      data,
      select: ORG_SELECT,
    })
    await logAudit({
      scope, action: 'update', entity: 'organization', entityId: org.id,
      changes: diffChanges((before ?? {}) as Record<string, unknown>, data),
    })
    publishEntityUpdated(scope.organizationId, 'organization', org.id, undefined, org, before ?? undefined)
    return NextResponse.json({ data: org })
  } catch (err) {
    return serverError(err, 'Failed to update organization', 400)
  }
}
