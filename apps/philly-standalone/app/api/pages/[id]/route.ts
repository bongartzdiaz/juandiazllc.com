/* GET    /api/pages/[id] — fetch single page with blocks (id or slug)
   PATCH  /api/pages/[id] — update page (title, slug, blocks) (manager+ only)
   DELETE /api/pages/[id] — delete page (admin only) */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireScope, requireRole, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { publishEntityUpdated, publishEntityDeleted } from '@/lib/philly/realtime/publish'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { parseBody } from '@/lib/philly/api/validate'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const patchSchema = z.object({
  title: z.string().max(255).optional(),
  slug: z.string().max(255).optional(),
  blocks: z
    .array(
      z
        .object({
          id: z.string().optional(),
          type: z.string().optional(),
          content: z.unknown().optional(),
          position: z.number().optional(),
        })
        .passthrough(),
    )
    .max(500)
    .optional(),
})

type RouteCtx = { params: Promise<{ id: string }> }

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page'
}

async function findPage(organizationId: string, idOrSlug: string) {
  const prisma = getAuthPrisma()
  return prisma.customPage.findFirst({
    where: {
      organizationId,
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
    include: { blocks: { orderBy: { position: 'asc' } } },
  })
}

export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const { id } = await ctx.params
  const page = await findPage(scope.organizationId, id)
  if (!page) return jsonError('Page not found', 404)
  return NextResponse.json({ data: page })
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin', 'manager'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pages.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params

  const body = await parseBody(req, patchSchema)
  if (body instanceof NextResponse) return body

  const prisma = getAuthPrisma()
  const existing = await prisma.customPage.findFirst({
    where: { organizationId: scope.organizationId, OR: [{ id }, { slug: id }] },
  })
  if (!existing) return jsonError('Page not found', 404)

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) {
    if (!body.title.trim()) return jsonError('title cannot be empty', 400)
    data.title = body.title.trim()
  }
  if (body.slug !== undefined) {
    const desired = slugify(body.slug)
    if (desired !== existing.slug) {
      const conflict = await prisma.customPage.findFirst({
        where: { organizationId: scope.organizationId, slug: desired, NOT: { id: existing.id } },
        select: { id: true },
      })
      if (conflict) return jsonError('Slug already in use', 409)
      data.slug = desired
    }
  }

  // Replace blocks atomically if supplied
  if (Array.isArray(body.blocks)) {
    await prisma.$transaction([
      prisma.pageBlock.deleteMany({ where: { pageId: existing.id } }),
      prisma.pageBlock.createMany({
        data: body.blocks.map((b, i) => ({
          pageId: existing.id,
          type: String(b.type ?? 'text'),
          content: JSON.stringify(b.content ?? {}),
          position: typeof b.position === 'number' ? b.position : i,
        })),
      }),
      prisma.customPage.update({ where: { id: existing.id }, data }),
    ])
  } else if (Object.keys(data).length > 0) {
    await prisma.customPage.update({ where: { id: existing.id }, data })
  }

  const page = await prisma.customPage.findFirst({
    where: { id: existing.id },
    include: { blocks: { orderBy: { position: 'asc' } } },
  })

  await logAudit({ scope, action: 'update', entity: 'customPage', entityId: existing.id })
  publishEntityUpdated(scope.organizationId, 'customPage', existing.id, scope.userId)
  return NextResponse.json({ data: page })
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireRole(['admin'])
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`pages.delete:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { id } = await ctx.params
  const prisma = getAuthPrisma()
  const existing = await prisma.customPage.findFirst({
    where: { organizationId: scope.organizationId, OR: [{ id }, { slug: id }] },
    select: { id: true },
  })
  if (!existing) return jsonError('Page not found', 404)

  await prisma.customPage.delete({ where: { id: existing.id } })
  await logAudit({ scope, action: 'delete', entity: 'customPage', entityId: existing.id })
  publishEntityDeleted(scope.organizationId, 'customPage', existing.id, scope.userId)

  return NextResponse.json({ data: { id: existing.id } })
}
