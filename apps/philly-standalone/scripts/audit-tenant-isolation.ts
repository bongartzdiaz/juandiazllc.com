#!/usr/bin/env tsx
/* ---------------------------------------------------------------
   Tenant-isolation audit
   ---------------------------------------------------------------
   Scans every API route under app/api/ and flags any that:

   - Do not call requireScope / requireRole / requireSection
     (auth gate missing)
   - Or call them but never reference scope.organizationId in a
     Prisma where / data clause (queries are not org-scoped)

   This is a static heuristic — not a substitute for cross-org
   integration tests (lib/security/cross-org.test.ts) — but it's
   fast and catches the common mistake of forgetting to scope a
   newly-added query.

   Allowed exceptions are listed in EXEMPT_PATHS below; touching that
   list requires a security-team review (the file is committed, so
   blame surfaces it).

   Usage:
     npx tsx scripts/audit-tenant-isolation.ts
     # exit 0 = clean, exit 1 = findings

   --------------------------------------------------------------- */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const ROOT = join(__dirname, '..')
const API_ROOT = join(ROOT, 'app', 'api')

// Routes that legitimately do NOT need an org scope. Each entry must
// be reviewed and have a one-line justification.
const EXEMPT_PATHS = new Set<string>([
  // Onboarding — caller has no Philly User row yet, so no org exists.
  'app/api/onboarding/status/route.ts',
  'app/api/onboarding/create-org/route.ts',
  // Self-service GDPR — scoped to scope.userId, not org. requireScope
  // is still called.
  'app/api/me/data-export/route.ts',
  'app/api/me/account-deletion/route.ts',
  // Cron — Bearer-secret auth, not user-scoped.
  'app/api/cron/gdpr-retention/route.ts',
  // Drip-campaign dispatcher cron — Bearer-secret auth via
  // CRON_SECRET. Sweeps every org's due enrollments; the per-org
  // tenancy is enforced inside the loop on each Prisma query.
  // Bundle CD — was a false positive on the previous regex.
  'app/api/cron/drip-dispatch/route.ts',
  // Public webhook receivers — auth is per-provider HMAC.
  'app/api/webhooks/inbound/[provider]/route.ts',
  'app/api/sms/webhook/route.ts',
  // Bundle DE — Stripe webhook signature-verified via
  // stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET).
  // organizationId comes from event.metadata + Stripe handles tenant
  // routing on its side — no session-based gate applies here.
  'app/api/webhooks/stripe/route.ts',
  // OAuth callback — runs before a session can exist.
  'app/api/integrations/oauth/callback/route.ts',
  // CSP report endpoint — public, no auth.
  'app/api/csp-report/route.ts',
  // Vitals endpoint — public, no PII.
  'app/api/vitals/route.ts',
  // Public API gateway — uses ApiKey auth + own scoping.
  'app/api/v1/[...path]/route.ts',
  // Health/readiness probes — public.
  'app/api/health/route.ts',
  'app/api/ready/route.ts',
  // Public unauthenticated error sink (rate-limited per-IP).
  'app/api/log-error/route.ts',
  // Self-scoped to the caller's own User row by primary key — there
  // is no possible way for the query to return another tenant's row.
  'app/api/me/route.ts',
  // Assistant health probe — admin-only diagnostics, no tenant data.
  'app/api/assistant/health/route.ts',
  // 2FA enrollment endpoints — operate on the calling user's own
  // User row by primary key (scope.userId). Cross-tenant
  // impossible because the User row is identified by the
  // Supabase-resolved id, which uniquely belongs to one org.
  'app/api/2fa/setup/route.ts',
  'app/api/2fa/verify/route.ts',
  'app/api/2fa/disable/route.ts',
  'app/api/2fa/recovery-codes/route.ts',
  // SCIM ServiceProviderConfig + ResourceTypes — RFC 7644 §4
  // discovery metadata; IdPs hit before authenticating, no tenant
  // data returned. The other SCIM endpoints (Users, Users/[id],
  // Groups, Groups/[id]) are now auto-recognised by the
  // authScimRequest pattern below — no longer need to be listed
  // here.
  'app/api/scim/v2/ServiceProviderConfig/route.ts',
  'app/api/scim/v2/ResourceTypes/route.ts',
])

interface Finding {
  path: string
  reason: string
}

async function* walkRouteFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      yield* walkRouteFiles(full)
    } else if (e.isFile() && e.name === 'route.ts') {
      yield full
    }
  }
}

async function audit(): Promise<Finding[]> {
  const findings: Finding[] = []

  for await (const filePath of walkRouteFiles(API_ROOT)) {
    const rel = relative(ROOT, filePath).replace(/\\/g, '/')
    if (EXEMPT_PATHS.has(rel)) continue

    const src = await readFile(filePath, 'utf8')

    // Recognised auth-gate patterns:
    //   - requireScope / requireRole / requireSection — Supabase-
    //     session-backed; canonical for in-app routes.
    //   - authScimRequest — bearer-token-backed; resolves an ApiKey
    //     row to { organizationId, scopes }. Bundle CD added so
    //     SCIM Groups + Groups/[id] don't surface as false positives
    //     after Bundle BW.
    const hasAuthGuard =
      /\brequireScope\b/.test(src) ||
      /\brequireRole\b/.test(src) ||
      /\brequireSection\b/.test(src) ||
      /\bauthScimRequest\b/.test(src)

    if (!hasAuthGuard) {
      findings.push({
        path: rel,
        reason:
          'no recognised auth gate (requireScope / requireRole / requireSection / authScimRequest)',
      })
      continue
    }

    // If the route calls Prisma directly, at least one query must
    // reference organizationId. We don't try to be smart about
    // distinguishing where vs data vs include — any mention of
    // `organizationId` in the file is enough to clear the heuristic.
    // Routes that legitimately do not query Prisma (e.g. pure
    // response-shapers) are exempted via EXEMPT_PATHS.
    const queriesPrisma = /\bprisma\.[a-zA-Z]+\.(?:findMany|findFirst|findUnique|create|update|upsert|delete|deleteMany|updateMany|count|aggregate|groupBy)\b/.test(
      src,
    )
    if (queriesPrisma && !/organizationId/.test(src)) {
      findings.push({
        path: rel,
        reason: 'queries Prisma but never references organizationId',
      })
    }
  }

  return findings
}

audit()
  .then((findings) => {
    if (findings.length === 0) {
      console.log('tenant-isolation audit: clean (no findings)')
      process.exit(0)
    }
    console.log(`tenant-isolation audit: ${findings.length} finding(s)\n`)
    for (const f of findings) {
      console.log(`  ${f.path}`)
      console.log(`    → ${f.reason}\n`)
    }
    process.exit(1)
  })
  .catch((err) => {
    console.error('audit failed:', err)
    process.exit(2)
  })
