/* POST /api/onboarding/create-org — bootstrap a new tenant.
   Body: { name: string, slug?: string }
   Behavior:
   - 201: Creates Organization, then User row in that org as 'admin'.
   - 401: not signed in to Supabase
   - 409: caller already has a Philly User row (use /api/users instead)
   - 409: requested slug already taken (or auto-generated collides) */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthPrisma } from '@/lib/philly/auth'
import { requireSupabaseUser, jsonError } from '@/lib/philly/auth-helpers'
import { validateBody } from '@/lib/philly/validation'
import { logAudit } from '@/lib/philly/audit'
import { enforceRateLimit, clientIp } from '@/lib/philly/rate-limit'
import { createOrgAndAdmin } from '@/lib/onboarding/create-org'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Public-facing endpoint; rate-limit aggressively per IP to prevent
// org-spam while still allowing legit retry on validation errors.
const ONBOARDING_LIMIT = { capacity: 5, refillPerSec: 5 / 3600 } as const

const createOrgSchema = z.object({
  name: z.string().min(2).max(120).transform((s) => s.trim()),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, hyphens')
    .optional(),
  displayName: z.string().min(1).max(120).optional(),
})

export async function POST(req: NextRequest) {
  const subject = await requireSupabaseUser()
  if (subject instanceof NextResponse) return subject

  const limited = enforceRateLimit(`onboarding:create-org:${clientIp(req)}`, ONBOARDING_LIMIT)
  if (limited) return limited

  const parsed = await validateBody(req, createOrgSchema)
  if (!parsed.success) return parsed.response

  const prisma = getAuthPrisma()
  const result = await createOrgAndAdmin(prisma, {
    email: subject.email,
    name: parsed.data.name,
    slug: parsed.data.slug,
    displayName: parsed.data.displayName,
  })

  if ('code' in result) {
    if (result.code === 'ALREADY_ONBOARDED') {
      return jsonError('Account already onboarded', 409)
    }
    return jsonError('Slug collision; please try a different organization name', 409)
  }

  await logAudit({
    scope: {
      userId: result.user.id,
      organizationId: result.organization.id,
      role: 'admin',
      email: result.user.email,
      dashboardSections: null,
      // Brand-new admin hasn't enrolled 2FA yet — they'll be
      // prompted on next admin click. Audit-write itself doesn't
      // need MFA, so this is fine here.
      mfaEnrolled: false,
    },
    action: 'create',
    entity: 'organization',
    entityId: result.organization.id,
    changes: {
      name: { old: null, new: result.organization.name },
      slug: { old: null, new: result.organization.slug },
      bootstrapAdmin: { old: null, new: result.user.email },
    },
  })

  return NextResponse.json(
    { organization: result.organization, user: result.user },
    { status: 201 },
  )
}
