/* GET  /api/pages — list custom pages (org-scoped)
   POST /api/pages — create page with optional initial blocks (manager+ only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { parsePagination, paginatedResponse } from '@/lib/philly/pagination'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityCreated } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(255),
  slug: z.string().trim().max(255).optional(),
  blocks: z
    .array(z.object({ type: z.string().optional(), content: z.unknown().optional() }).passthrough())
    .max(500)
    .optional(),
})

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page'
}

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { page, limit, skip } = parsePagination(req)
  const prisma = getAuthPrisma()
  const where = { organizationId: scope.organizationId }
  const [pages, total] = await Promise.all([
    prisma.customPage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { blocks: true } },
      },
    }),
    prisma.customPage.count({ where }),
  ])

  return paginatedResponse(pages, total, { page, limit, skip })
}

export async function POST(req: NextRequest) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pages.create:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const body = await parseBody(req, createSchema)
  if (body instanceof NextResponse) return body

  const baseSlug = slugify(body.slug || body.title)
  const prisma = getAuthPrisma()

  // ensure unique slug within org
  let slug = baseSlug
  let n = 1
  while (await prisma.customPage.findFirst({
    where: { organizationId: scope.organizationId, slug },
    select: { id: true },
  })) {
    n += 1
    slug = `${baseSlug}-${n}`
    if (n > 200) return jsonError('Could not generate unique slug', 500)
  }

  const page = await prisma.customPage.create({
    data: {
      organizationId: scope.organizationId,
      title: body.title,
      slug,
      createdBy: scope.userId,
      blocks: {
        create: (body.blocks ?? []).map((b, i) => ({
          type: String(b.type ?? 'text'),
          content: JSON.stringify(b.content ?? {}),
          position: i,
        })),
      },
    },
    include: { blocks: { orderBy: { position: 'asc' } } },
  })

  await logAudit({ scope, action: 'create', entity: 'customPage', entityId: page.id })
  publishEntityCreated(scope.organizationId, 'customPage', page.id, scope.userId)
  return NextResponse.json({ data: page }, { status: 201 })
}
