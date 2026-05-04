/* GET    /api/scim/v2/Users/[id] — fetch a single user
   PATCH  /api/scim/v2/Users/[id] — partial update (RFC 7644 §3.5.2)
   PUT    /api/scim/v2/Users/[id] — full replace (RFC 7644 §3.5.1)
   DELETE /api/scim/v2/Users/[id] — schedule for deletion */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { authScimRequest, scimGate } from '@/lib/philly/scim/auth'
import {
  scimJson,
  scimError,
  isValidPatchRequest,
  type PatchOperation,
} from '@/lib/philly/scim/schemas'
import { parseScimUserInput, userToScim } from '@/lib/philly/scim/mapping'
import { logAudit } from '@/lib/philly/audit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ id: string }> }

const SELECT = {
  id: true,
  email: true,
  name: true,
  organizationId: true,
  deletionScheduledAt: true,
  createdAt: true,
  scimExternalId: true,
} as const

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  // Bundle BQ — accept either the platform id OR the SCIM externalId
  // as the lookup key. IdPs that store externalId locally can hit
  // /Users/<externalId> directly.
  const user = await prisma.user.findFirst({
    where: {
      organizationId: auth.organizationId,
      OR: [{ id }, { scimExternalId: id }],
    },
    select: SELECT,
  })
  if (!user) return scimError(404, `User ${id} not found`)

  const url = new URL(req.url)
  return scimJson(userToScim(user, `${url.origin}/api/scim/v2`))
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  let body: unknown
  try { body = await req.json() } catch { return scimError(400, 'Invalid JSON', 'invalidSyntax') }

  let parsed
  try { parsed = parseScimUserInput(body) } catch (err) {
    return scimError(400, err instanceof Error ? err.message : 'Invalid SCIM User', 'invalidValue')
  }

  const existing = await prisma.user.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, email: true },
  })
  if (!existing) return scimError(404, `User ${id} not found`)

  // userName change → uniqueness check.
  if (parsed.email !== existing.email) {
    const clash = await prisma.user.findUnique({
      where: { email: parsed.email }, select: { id: true },
    })
    if (clash && clash.id !== id) {
      return scimError(409, `userName "${parsed.email}" already in use`, 'uniqueness')
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      email: parsed.email,
      name: parsed.name,
      // Bundle BQ — round-trip externalId on PUT. RFC 7644 PUT
      // replaces the resource so an absent / null externalId in
      // the payload must clear the column. parseScimUserInput
      // already coerces missing → null. Bundle CC audit fix.
      scimExternalId: parsed.externalId,
      // Bundle CG — only mutate deletion state when active is
      // explicit. Omitted active leaves the existing flag alone, so
      // a re-sync PUT doesn't undelete a previously-soft-deleted user.
      ...(parsed.active === false
        ? { deletionScheduledAt: new Date() }
        : parsed.active === true
          ? { deletionScheduledAt: null, tokensInvalidAfter: null }
          : {}),
    },
    select: SELECT,
  })

  await logAudit({
    scope: { userId: user.id, organizationId: auth.organizationId, role: 'admin', email: user.email, dashboardSections: null, mfaEnrolled: false },
    action: 'update',
    entity: 'user',
    entityId: user.id,
    changes: { putVia: { old: null, new: 'scim' } },
  }).catch(() => { /* best-effort */ })

  const url = new URL(req.url)
  return scimJson(userToScim(user, `${url.origin}/api/scim/v2`))
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  let body: unknown
  try { body = await req.json() } catch { return scimError(400, 'Invalid JSON', 'invalidSyntax') }
  if (!isValidPatchRequest(body)) {
    return scimError(400, 'Body must be a SCIM PatchOp request', 'invalidSyntax')
  }

  const existing = await prisma.user.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, email: true, name: true, deletionScheduledAt: true },
  })
  if (!existing) return scimError(404, `User ${id} not found`)

  const data: Record<string, unknown> = {}
  for (const op of body.Operations) {
    const result = applyPatchOp(op, existing, data)
    if (result instanceof Object && 'error' in result) {
      return scimError(400, result.error, 'invalidValue')
    }
  }

  // Email-uniqueness recheck if email changed
  if (typeof data.email === 'string' && data.email !== existing.email) {
    const clash = await prisma.user.findUnique({
      where: { email: data.email }, select: { id: true },
    })
    if (clash && clash.id !== id) {
      return scimError(409, `userName "${data.email}" already in use`, 'uniqueness')
    }
  }

  const user = await prisma.user.update({
    where: { id }, data, select: SELECT,
  })

  await logAudit({
    scope: { userId: user.id, organizationId: auth.organizationId, role: 'admin', email: user.email, dashboardSections: null, mfaEnrolled: false },
    action: 'update',
    entity: 'user',
    entityId: user.id,
    changes: { patchedVia: { old: null, new: 'scim' } },
  }).catch(() => { /* best-effort */ })

  const url = new URL(req.url)
  return scimJson(userToScim(user, `${url.origin}/api/scim/v2`))
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const auth = await authScimRequest(req)
  if (auth instanceof NextResponse) return auth
  const { id } = await ctx.params

  const prisma = getAuthPrisma()
  const gated = await scimGate(prisma, auth.organizationId)
  if (gated) return gated

  const existing = await prisma.user.findFirst({
    where: { id, organizationId: auth.organizationId },
    select: { id: true, email: true },
  })
  if (!existing) return scimError(404, `User ${id} not found`)

  // Soft delete: mark for the standard 30-day grace, bump
  // tokensInvalidAfter so any active session is killed at next
  // requireScope() check. The retention cron finalises the delete.
  await prisma.user.update({
    where: { id },
    data: {
      deletionScheduledAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      tokensInvalidAfter: new Date(),
    },
  })

  await logAudit({
    scope: { userId: id, organizationId: auth.organizationId, role: 'admin', email: existing.email, dashboardSections: null, mfaEnrolled: false },
    action: 'delete',
    entity: 'user',
    entityId: id,
    changes: { deprovisionedVia: { old: null, new: 'scim' } },
  }).catch(() => { /* best-effort */ })

  return new NextResponse(null, { status: 204 })
}

/* ── PATCH op application ────────────────────────────────────── */

interface ExistingForPatch {
  email: string
  name: string
  deletionScheduledAt: Date | null
}

function applyPatchOp(
  op: PatchOperation,
  _existing: ExistingForPatch,
  data: Record<string, unknown>,
): { error: string } | void {
  // SCIM PATCH paths IdPs actually use:
  //   "active"          (replace)
  //   "userName"        (replace)
  //   "name.givenName" / "name.familyName" / "name.formatted" (replace)
  //   "emails[type eq \"work\"].value" — common from Okta
  //
  // We support a pragmatic subset; anything else returns 400.
  const path = op.path?.trim() ?? null
  const value = op.value

  if (op.op === 'remove') {
    // Most IdPs don't issue `remove` against User attributes we
    // support. Treat as no-op for unknown paths to be lenient.
    if (path === 'active') {
      data.deletionScheduledAt = new Date()
      data.tokensInvalidAfter = new Date()
    }
    return
  }

  // Path-less replace: value is an object spelling out fields to set
  if (!path && op.op === 'replace' && value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    if (typeof v.userName === 'string') data.email = v.userName
    if (typeof v.externalId === 'string') data.scimExternalId = v.externalId
    if (typeof v.active === 'boolean') {
      if (v.active === false) {
        data.deletionScheduledAt = new Date()
        data.tokensInvalidAfter = new Date()
      } else {
        data.deletionScheduledAt = null
        data.tokensInvalidAfter = null
      }
    }
    if (v.name && typeof v.name === 'object') {
      const n = v.name as Record<string, unknown>
      if (typeof n.formatted === 'string' && n.formatted) data.name = n.formatted
      else if (typeof n.givenName === 'string' || typeof n.familyName === 'string') {
        const given = typeof n.givenName === 'string' ? n.givenName : ''
        const family = typeof n.familyName === 'string' ? n.familyName : ''
        const composed = `${given} ${family}`.trim()
        if (composed) data.name = composed
      }
    }
    return
  }

  if (!path) return { error: 'replace operation must have a path or an object value' }

  // Path-ed replace
  if (path === 'active') {
    if (typeof value !== 'boolean') return { error: '`active` must be a boolean' }
    if (value === false) {
      data.deletionScheduledAt = new Date()
      data.tokensInvalidAfter = new Date()
    } else {
      data.deletionScheduledAt = null
      data.tokensInvalidAfter = null
    }
    return
  }
  if (path === 'userName') {
    if (typeof value !== 'string') return { error: '`userName` must be a string' }
    data.email = value
    return
  }
  if (path === 'externalId') {
    if (typeof value !== 'string') return { error: '`externalId` must be a string' }
    data.scimExternalId = value
    return
  }
  if (path === 'name.formatted') {
    if (typeof value === 'string' && value) data.name = value
    return
  }
  if (path === 'name.givenName' || path === 'name.familyName') {
    // We don't store given/family separately. Best-effort: leave name
    // alone if no matching `formatted` value. IdPs usually send all
    // three together; the next operation in the same PATCH likely
    // sets `name.formatted`.
    return
  }
  if (path.startsWith('emails')) {
    // Pattern from Okta: emails[type eq "work"].value
    if (typeof value === 'string' && value) data.email = value
    return
  }
  // Unknown path — return 400 instead of silently dropping.
  return { error: `Unsupported PATCH path: ${path}` }
}
