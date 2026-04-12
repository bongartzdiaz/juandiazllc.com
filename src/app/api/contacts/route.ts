/* GET  /api/contacts — list contacts in the user's org (paginated)
   POST /api/contacts — create a new contact (manager+ only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole } from '@/lib/auth-helpers'
import { validateBody } from '@/lib/validation'
import { createContactSchema } from '@/lib/validation/schemas'
import { parsePagination, paginatedResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? undefined
  const search = url.searchParams.get('q') ?? undefined

  const prisma = getAuthPrisma()

  const where = {
    organizationId: scope.organizationId,
    ...(type ? { type } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { company: { contains: search } },
          ],
        }
      : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { contactProjects: true } },
      },
    }),
    prisma.contact.count({ where }),
  ])

  return paginatedResponse(contacts, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const parsed = await validateBody(req, createContactSchema)
  if (!parsed.success) return parsed.response

  const input = parsed.data
  const prisma = getAuthPrisma()

  const contact = await prisma.contact.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      type: input.type,
      company: input.company,
      notes: input.notes,
      avatarUrl: input.avatarUrl,
      organizationId: scope.organizationId,
    },
  })

  await logAudit({ scope, action: 'create', entity: 'contact', entityId: contact.id })

  return NextResponse.json({ data: contact }, { status: 201 })
}
