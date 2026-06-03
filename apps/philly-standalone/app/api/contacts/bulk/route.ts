/* POST /api/contacts/bulk — bulk operations on contacts
   Body: { action: 'delete' | 'update' | 'export', ids: string[], data?: {} } */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { decryptPii } from '@/lib/philly/pii'
import { parseBody } from '@/lib/philly/api/validate'
import { idSchema } from '@/lib/philly/api/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bulkSchema = z.object({
  action: z.enum(['delete', 'update', 'export']),
  ids: z.array(idSchema).min(1, 'ids must be a non-empty array').max(200, 'Maximum 200 items per bulk operation'),
  // Only `type` and `company` are applied (allow-list enforced below); keep
  // the schema permissive on shape but bounded so we never accept a huge blob.
  data: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`contacts:bulk:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, bulkSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()

  // Verify all contacts belong to the user's org
  const owned = await prisma.contact.findMany({
    where: { id: { in: body.ids }, organizationId: scope.organizationId },
    select: { id: true },
  })
  const ownedIds = owned.map((c: any) => c.id)

  if (body.action === 'delete') {
    const result = await prisma.contact.deleteMany({
      where: { id: { in: ownedIds } },
    })
    for (const id of ownedIds) {
      await logAudit({ scope, action: 'delete', entity: 'contact', entityId: id })
    }
    return NextResponse.json({ data: { deleted: result.count } })
  }

  if (body.action === 'update') {
    if (!body.data || Object.keys(body.data).length === 0) {
      return jsonError('data is required for update action', 400)
    }
    const allowed = ['type', 'company'] as const
    const updateData: Record<string, unknown> = {}
    for (const key of allowed) {
      if (body.data[key] !== undefined) updateData[key] = body.data[key]
    }

    const result = await prisma.contact.updateMany({
      where: { id: { in: ownedIds } },
      data: updateData,
    })
    return NextResponse.json({ data: { updated: result.count } })
  }

  if (body.action === 'export') {
    const contacts = await prisma.contact.findMany({
      where: { id: { in: ownedIds } },
      include: { contactProjects: { include: { project: { select: { title: true } } } } },
    })
    // Decrypt at-rest PII fields (Bundles N + P) before handing back.
    const decrypted = contacts.map((c: any) => ({
      ...c,
      email: decryptPii(c.email) ?? '',
      phone: decryptPii(c.phone) ?? '',
      notes: decryptPii(c.notes),
    }))
    return NextResponse.json({ data: decrypted })
  }

  return jsonError('Unknown action. Use: delete, update, export', 400)
}
