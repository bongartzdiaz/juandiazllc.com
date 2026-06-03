/* ---------------------------------------------------------------
   A-13 — operator guard for the li.* outreach surface.

   The `li.*` Supabase schema (LinkedIn outreach leads/messages/campaigns) is
   intentionally SINGLE-TENANT: it holds the operator's own outreach pipeline,
   surfaced inside DEUS as a dashboard. It has NO organization_id column, so
   `liClient()` queries cannot be org-scoped. The `/api/outreach/*` routes only
   gate on `requireScope()` / `requireRole(['admin','manager'])` — which means
   ANY customer org's admin/manager would see the operator's outreach data the
   moment a second organization exists. That is the latent A-13 leak.

   This guard closes it without a Supabase schema migration, mirroring the
   deny-by-default philosophy of the A-01 auto-provision fix:

     - If OUTREACH_OPERATOR_ORG_IDS is set (comma-separated org ids), only those
       organizations may reach the outreach surface; everyone else gets a 404.
     - If it is unset, fall back to the org count: a single-organization deploy
       is genuinely single-tenant (no cross-tenant leak is possible), so allow
       it; the moment a SECOND organization exists with no allowlist configured,
       deny (404) and log a warning telling the operator to set the env var.

   Net effect: the guard self-activates exactly when the risk appears
   (customer #2) and never breaks the current single-operator dashboard. It
   returns 404 (not 403) so the existence of the operator-only surface is not
   disclosed to other tenants.
   --------------------------------------------------------------- */

import { NextResponse } from 'next/server'
import type { AuthScope } from '@/lib/philly/auth-helpers'
import { jsonError } from '@/lib/philly/auth-helpers'
import { getAuthPrisma } from '@/lib/philly/auth'
import { logger } from '@/lib/philly/logger'

const ENV_KEY = 'OUTREACH_OPERATOR_ORG_IDS'

/** Parse the comma-separated operator-org allowlist, or [] if unset. */
export function outreachOperatorOrgIds(): string[] {
  return (process.env[ENV_KEY] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Returns a 404 NextResponse if `scope` may NOT access the single-tenant
 * outreach surface, or null if access is allowed. Call right after the
 * requireScope()/requireRole() check in every /api/outreach/* handler.
 */
export async function denyIfNotOutreachOperator(
  scope: AuthScope,
): Promise<NextResponse | null> {
  const allowlist = outreachOperatorOrgIds()

  if (allowlist.length > 0) {
    return allowlist.includes(scope.organizationId) ? null : jsonError('Not found', 404)
  }

  // No allowlist configured: allow only while the deploy is genuinely
  // single-tenant. Once a 2nd org exists, deny until the operator configures
  // OUTREACH_OPERATOR_ORG_IDS.
  const orgCount = await getAuthPrisma().organization.count()
  if (orgCount <= 1) return null

  logger.warn(
    `[outreach] ${ENV_KEY} is unset but ${orgCount} organizations exist — ` +
      `denying outreach access to org ${scope.organizationId}. Set ${ENV_KEY} ` +
      `to the operator org id(s) to grant access.`,
  )
  return jsonError('Not found', 404)
}
