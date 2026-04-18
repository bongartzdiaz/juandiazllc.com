/* POST /api/api-keys/[id]/rotate — generate a new key for an existing record */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { generateApiKey } from '@/lib/philly/api-keys'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: NextRequest, ctx: Ctx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const existing = await prisma.apiKey.findFirst({
    where: { id, organizationId: scope.organizationId },
    select: { id: true, name: true, permissions: true, expiresAt: true },
  })
  if (!existing) return jsonError('API key not found', 404)

  const { raw, hash, prefix } = generateApiKey()

  const updated = await prisma.apiKey.update({
    where: { id },
    data: {
      keyHash: hash,
      prefix,
      lastUsedAt: null,
    },
    select: { id: true, name: true, prefix: true, permissions: true, expiresAt: true, createdAt: true },
  })

  await logAudit({ scope, action: 'update', entity: 'apiKey', entityId: id })

  return NextResponse.json({
    data: {
      ...updated,
      key: raw,
      warning: 'New key — old key is invalid. Update your integrations.',
    },
  })
}
