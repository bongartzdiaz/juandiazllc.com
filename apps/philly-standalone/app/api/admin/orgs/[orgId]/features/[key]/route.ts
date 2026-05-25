/* PUT /api/admin/orgs/[orgId]/features/[key]
   GET /api/admin/orgs/[orgId]/features/[key]
   ───────────────────────────────────────────────────────────────────
   Super-admin (User.role === 'superAdmin') endpoints for the Layer-1
   feature-toggle UX. Distinct from /api/admin/features/* (org-level
   admin self-service for THEIR OWN org); these endpoints write
   OrgFeatureOverride rows that bypass plan-tier checks and beat
   client-admin opt-out flags.

   Every write is:
     - Auth-gated by requireSuperAdmin (role + unconditional MFA)
     - Rate-limited (PRESET_MUTATION)
     - Body-validated via setOrgFeatureOverrideSchema
     - Audit-logged with hash-chain (entity='orgFeatureOverride')
     - Posted to SLACK_ALERTS_WEBHOOK fire-and-forget (if configured)
     - Cache-busted in lib/philly/features.ts so the next request sees
       the new effective state

   GET returns the resolved state via isFeatureEnabledForOrg() so the
   UI can show the current `{enabled, source}` plus a flag for whether
   an OrgFeatureOverride row exists.

   PR-2b/4. */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSuperAdmin, jsonError } from '@/lib/philly/auth-helpers'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, PRESET_MUTATION } from '@/lib/philly/rate-limit'
import { FEATURES, bustFeatureCache, type FeatureKey } from '@/lib/philly/features'
import { isFeatureEnabledForOrg } from '@/lib/philly/features/adapter'
import { notifySuperAdminOverride } from '@/lib/philly/features/slack-notify'
import type { SuperAdminOverride } from '@/lib/philly/features/resolve'
import { setOrgFeatureOverrideSchema } from '@/lib/philly/validation/schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteCtx = { params: Promise<{ orgId: string; key: string }> }

const ALL_KEYS: ReadonlySet<FeatureKey> = new Set(
  Object.values(FEATURES).map(f => f.key) as FeatureKey[],
)

function isFeatureKey(s: string): s is FeatureKey {
  return (ALL_KEYS as ReadonlySet<string>).has(s)
}

function normalizeOverride(value: string | undefined): SuperAdminOverride {
  if (value === 'FORCED_ON' || value === 'FORCED_OFF') return value
  return 'INHERIT'
}

/* GET — resolved effective state + override row (if any). */
export async function GET(_req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSuperAdmin()
  if (scope instanceof NextResponse) return scope

  const { orgId, key } = await ctx.params
  if (!isFeatureKey(key)) return jsonError('Unknown feature key', 400)

  const prisma = getAuthPrisma()

  // Confirm the target org exists. Returning 404 here is safer than
  // happily resolving a feature for a non-existent org (which would
  // return enabled=false / plan-not-included by adapter fallbacks but
  // give the operator misleading "I just toggled it" UX).
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  })
  if (!org) return jsonError('Organization not found', 404)

  const [result, override] = await Promise.all([
    isFeatureEnabledForOrg(prisma, orgId, key),
    prisma.orgFeatureOverride.findUnique({
      where: { organizationId_feature: { organizationId: orgId, feature: key } },
      select: { state: true, reason: true, createdById: true, createdAt: true, updatedAt: true },
    }),
  ])

  return NextResponse.json({
    data: {
      organizationId: orgId,
      organizationName: org.name,
      feature: key,
      enabled: result.enabled,
      source: result.source,
      override: override
        ? {
            state: normalizeOverride(override.state),
            reason: override.reason,
            createdById: override.createdById,
            createdAt: override.createdAt,
            updatedAt: override.updatedAt,
          }
        : null,
    },
  })
}

/* PUT — upsert (or delete on INHERIT) the OrgFeatureOverride. */
export async function PUT(req: NextRequest, ctx: RouteCtx) {
  const scope = await requireSuperAdmin()
  if (scope instanceof NextResponse) return scope

  const limited = enforceRateLimit(`admin.orgs.features.update:${scope.userId}`, PRESET_MUTATION)
  if (limited) return limited

  const { orgId, key } = await ctx.params
  if (!isFeatureKey(key)) return jsonError('Unknown feature key', 400)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError('Invalid JSON', 400)
  }
  const parsed = setOrgFeatureOverrideSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? 'Invalid input', 400)
  }

  const { state: newState, reason } = parsed.data
  const prisma = getAuthPrisma()

  // Confirm target org exists (same defensive 404 as GET).
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  })
  if (!org) return jsonError('Organization not found', 404)

  // Snapshot previous state for audit diff + Slack message.
  const before = await prisma.orgFeatureOverride.findUnique({
    where: { organizationId_feature: { organizationId: orgId, feature: key } },
    select: { state: true, reason: true },
  })
  const previousState: SuperAdminOverride = normalizeOverride(before?.state)

  // Resolve the resulting effective state for the response. Compute
  // BEFORE the write to know previous effective enabled, then AFTER for
  // the response.
  const previousResolved = await isFeatureEnabledForOrg(prisma, orgId, key)

  // INHERIT means "remove the override, fall back to plan/global/org/default".
  // We DELETE the row instead of writing state='INHERIT'. This keeps the
  // table small (only rows for actual overrides) and means the absence of
  // a row is the canonical "no override" state.
  if (newState === 'INHERIT') {
    if (before) {
      await prisma.orgFeatureOverride.delete({
        where: { organizationId_feature: { organizationId: orgId, feature: key } },
      })
    }
  } else {
    await prisma.orgFeatureOverride.upsert({
      where: { organizationId_feature: { organizationId: orgId, feature: key } },
      update: { state: newState, reason, createdById: scope.userId },
      create: {
        organizationId: orgId,
        feature: key,
        state: newState,
        reason,
        createdById: scope.userId,
      },
    })
  }

  // Bust the cache so the next read sees the change immediately.
  bustFeatureCache(orgId, key)

  // Re-resolve to get the new effective state.
  const nextResolved = await isFeatureEnabledForOrg(prisma, orgId, key)

  // Audit log — TARGET org (not super-admin's home org) so the trail
  // lives with the affected tenant for compliance discovery.
  await logAudit({
    scope: { ...scope, organizationId: orgId },
    action: 'update',
    entity: 'orgFeatureOverride',
    entityId: key,
    changes: {
      state: { old: previousState, new: newState },
      reason: { old: before?.reason ?? null, new: newState === 'INHERIT' ? null : reason },
      effectiveEnabled: { old: previousResolved.enabled, new: nextResolved.enabled },
      effectiveSource: { old: previousResolved.source, new: nextResolved.source },
    },
  })

  // Slack — fire-and-forget; failures already swallowed in the helper.
  void notifySuperAdminOverride({
    actorEmail: scope.email,
    organizationId: orgId,
    organizationName: org.name,
    feature: key,
    previousState,
    newState,
    reason,
  })

  return NextResponse.json({
    data: {
      organizationId: orgId,
      feature: key,
      override: newState === 'INHERIT' ? null : { state: newState, reason },
      enabled: nextResolved.enabled,
      source: nextResolved.source,
    },
  })
}
