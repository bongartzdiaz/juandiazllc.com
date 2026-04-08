/* GET  /api/contacts — list contacts in the user's org
   POST /api/contacts — create a new contact (manager+ only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/auth'
import { requireScope, requireRole, jsonError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const type = url.searchParams.get('type') ?? undefined
  const search = url.searchParams.get('q') ?? undefined

  const prisma = getAuthPrisma()
  const contacts = await prisma.contact.findMany({
    where: {
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
    },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { contactProjects: true } },
    },
  })

  return NextResponse.json({ data: contacts })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON body', 400)
  }

  const input = body as {
    name?: string
    email?: string
    phone?: string
    type?: string
    company?: string
    notes?: string
    avatarUrl?: string | null
  }

  if (!input.name?.trim()) {
    return jsonError('name is required', 400)
  }

  const prisma = getAuthPrisma()
  const contact = await prisma.contact.create({
    data: {
      name: input.name.trim(),
      email: input.email?.trim() ?? '',
      phone: input.phone?.trim() ?? '',
      type: input.type ?? 'stakeholder',
      company: input.company?.trim() ?? '',
      notes: input.notes ?? '',
      avatarUrl: input.avatarUrl ?? null,
      organizationId: scope.organizationId,
    },
  })

  return NextResponse.json({ data: contact }, { status: 201 })
}
