/* GET  /api/scim/v2/Groups   — list (filterable, paginated)
   POST /api/scim/v2/Groups   — provision a new group
   ───────────────────────────────────────────────────────────────
   RFC 7644 §3.4.2 (search/list) + §3.3 (create).
   Bundle BW.

   Filter support: displayName eq <str>, externalId eq <str>,
   AND combinations (same as Users — see lib/philly/scim/filter.ts). */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { authScimRequest, scimGate } from '@/lib/philly/scim/auth'
import { parseScimFilter } from '@/lib/philly/scim/filter'
import {
  scimJson, scimError,
  LIST_RESPONSE_SCHEMA, type ScimGroup,
} from '@/lib/philly/scim/schemas'
import { parseScimGroupInput, groupToScim } from '@/lib/philly/scim/group-mapping'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_COUNT = 200

export async function GET(req: NextRequest) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  const url = new URL(req.url)
  const filter = parseScimFilter(url.searchParams.get('filter'))
  if (filter === null) {
    return scimError(400, 'Unsupported filter expression for Groups. Supported: displayName eq <string>, externalId eq <string>.', 'invalidFilter')
  }

  const startIndex = Math.max(1, parseInt(url.searchParams.get('startIndex') ?? '1', 10) || 1)
  const count = Math.min(MAX_COUNT, Math.max(0, parseInt(url.searchParams.get('count') ?? '100', 10) || 100))

  const where: Record<string, unknown> = { organizationId: auth.organizationId }
  // userName eq is not meaningful for groups; we reuse the same filter
  // parser shape and pull the relevant attributes.
  if (filter.userName) where.displayName = filter.userName
  if (filter.externalId) where.scimExternalId = filter.externalId

  const [groups, total] = await Promise.all([
    count === 0 ? Promise.resolve([]) : prisma.scimGroup.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: startIndex - 1,
      take: count,
      include: {
        members: {
          include: { user: { select: { id: true, email: true } } },
        },
      },
    }),
    prisma.scimGroup.count({ where }),
  ])

  const baseUrl = `${url.origin}/api/scim/v2`
  type GroupWithMembers = {
    id: string
    organizationId: string
    scimExternalId: string | null
    displayName: string
    createdAt: Date
    updatedAt: Date
    members: Array<{ user: { id: string; email: string } }>
  }
  const Resources: ScimGroup[] = (groups as GroupWithMembers[]).map((g) =>
    groupToScim({
      id: g.id,
      organizationId: g.organizationId,
      scimExternalId: g.scimExternalId,
      displayName: g.displayName,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      members: g.members.map((m) => ({ id: m.user.id, email: m.user.email })),
    }, baseUrl),
  )

  return scimJson({
    schemas: [LIST_RESPONSE_SCHEMA],
    totalResults: total,
    startIndex,
    itemsPerPage: Resources.length,
    Resources,
  })
}

export async function POST(req: NextRequest) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  let body: unknown
  try { body = await req.json() } catch {
    return scimError(400, 'Invalid JSON body', 'invalidSyntax')
  }
  let parsed
  try { parsed = parseScimGroupInput(body) } catch (err) {
    return scimError(400, err instanceof Error ? err.message : 'Invalid SCIM Group', 'invalidValue')
  }

  // Uniqueness check (displayName is unique per org).
  const existing = await prisma.scimGroup.findFirst({
    where: { organizationId: auth.organizationId, displayName: parsed.displayName },
    select: { id: true },
  })
  if (existing) {
    return scimError(409, `Group with displayName "${parsed.displayName}" already exists`, 'uniqueness')
  }

  // Validate every member id belongs to the same org. Drop unknowns
  // silently — IdPs sometimes send stale ids.
  const memberRows = parsed.memberIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: parsed.memberIds }, organizationId: auth.organizationId },
        select: { id: true, email: true },
      })
    : []
  const validMemberIds = new Set(memberRows.map((u) => u.id))

  const created = await prisma.scimGroup.create({
    data: {
      organizationId: auth.organizationId,
      displayName: parsed.displayName,
      ...(parsed.externalId ? { scimExternalId: parsed.externalId } : {}),
      members: {
        create: [...validMemberIds].map((userId) => ({ userId })),
      },
    },
    include: {
      members: { include: { user: { select: { id: true, email: true } } } },
    },
  })

  await logAudit({
    scope: { userId: '_scim', organizationId: auth.organizationId, role: 'admin', email: '_scim', dashboardSections: null, mfaEnrolled: false },
    action: 'create',
    entity: 'scimGroup',
    entityId: created.id,
    changes: { displayName: { old: null, new: created.displayName }, members: { old: null, new: validMemberIds.size } },
  }).catch(() => { /* best-effort */ })

  const url = new URL(req.url)
  const baseUrl = `${url.origin}/api/scim/v2`
  return scimJson(groupToScim({
    id: created.id,
    organizationId: created.organizationId,
    scimExternalId: created.scimExternalId,
    displayName: created.displayName,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
    members: created.members.map((m) => ({ id: m.user.id, email: m.user.email })),
  }, baseUrl), 201)
}
