/* GET  /api/scim/v2/Users   — list users (filterable, paginated)
   POST /api/scim/v2/Users   — provision a new user from the IdP
   ───────────────────────────────────────────────────────────────
   RFC 7644 §3.4.2 (search/list) + §3.3 (create).
   Bearer-token auth via lib/philly/scim/auth — token must have
   the `scim:users` scope and is bound to a single organization. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { authScimRequest, scimGate } from '@/lib/philly/scim/auth'
import { parseScimFilter } from '@/lib/philly/scim/filter'
import {
  scimJson,
  scimError,
  LIST_RESPONSE_SCHEMA,
  type ScimUser,
} from '@/lib/philly/scim/schemas'
import { parseScimUserInput, userToScim } from '@/lib/philly/scim/mapping'
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
    return scimError(400, 'Unsupported filter expression. Supported: userName eq <string>, active eq <bool>, conjunctions of both.', 'invalidFilter')
  }

  const startIndex = Math.max(1, parseInt(url.searchParams.get('startIndex') ?? '1', 10) || 1)
  const count = Math.min(MAX_COUNT, Math.max(0, parseInt(url.searchParams.get('count') ?? '100', 10) || 100))

  const where: Record<string, unknown> = { organizationId: auth.organizationId }
  if (filter.userName) where.email = filter.userName
  if (filter.externalId) where.scimExternalId = filter.externalId
  if (filter.active === true) where.deletionScheduledAt = null
  if (filter.active === false) where.deletionScheduledAt = { not: null }

  const [users, total] = await Promise.all([
    count === 0
      ? Promise.resolve([])
      : prisma.user.findMany({
          where,
          orderBy: { createdAt: 'asc' },
          skip: startIndex - 1,
          take: count,
          select: {
            id: true,
            email: true,
            name: true,
            organizationId: true,
            deletionScheduledAt: true,
            createdAt: true,
            scimExternalId: true,
          },
        }),
    prisma.user.count({ where }),
  ])

  const baseUrl = `${url.origin}/api/scim/v2`
  const Resources: ScimUser[] = users.map((u) => userToScim(u, baseUrl))
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
  try {
    body = await req.json()
  } catch {
    return scimError(400, 'Invalid JSON body', 'invalidSyntax')
  }

  let parsed
  try {
    parsed = parseScimUserInput(body)
  } catch (err) {
    return scimError(400, err instanceof Error ? err.message : 'Invalid SCIM User', 'invalidValue')
  }

  // Uniqueness check (RFC 7644 §3.3 — return 409 + scimType:uniqueness)
  const existing = await prisma.user.findUnique({
    where: { email: parsed.email },
    select: { id: true, organizationId: true },
  })
  if (existing) {
    return scimError(409, `User with userName "${parsed.email}" already exists`, 'uniqueness')
  }

  const user = await prisma.user.create({
    data: {
      email: parsed.email,
      name: parsed.name,
      passwordHash: '', // SSO-provisioned — no local password; SAML/OIDC is the auth path
      role: 'viewer',
      organizationId: auth.organizationId,
      // Bundle BQ — externalId now persists. IdPs can de-provision
      // by externalId via DELETE /Users/<id> after looking up the
      // platform id with `?filter=externalId eq "..."`.
      ...(parsed.externalId ? { scimExternalId: parsed.externalId } : {}),
      ...(parsed.active === false ? { deletionScheduledAt: new Date() } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      organizationId: true,
      deletionScheduledAt: true,
      createdAt: true,
      scimExternalId: true,
    },
  })

  // Mirror to Membership table (Bundle G) so the user has a home-org
  // membership row from day 1.
  await prisma.membership
    .upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: auth.organizationId } },
      create: { userId: user.id, organizationId: auth.organizationId, role: 'viewer' },
      update: {},
    })
    .catch(() => { /* swallow — non-fatal */ })

  await logAudit({
    scope: { userId: user.id, organizationId: auth.organizationId, role: 'admin', email: user.email, dashboardSections: null, mfaEnrolled: false },
    action: 'create',
    entity: 'user',
    entityId: user.id,
    changes: { provisionedVia: { old: null, new: 'scim' } },
  }).catch(() => { /* best-effort */ })

  const url = new URL(req.url)
  const baseUrl = `${url.origin}/api/scim/v2`
  return scimJson(userToScim(user, baseUrl), 201)
}
