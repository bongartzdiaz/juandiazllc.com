/* POST /philly/api/onboarding/create-org — bootstrap a new tenant.
   ─────────────────────────────────────────────────────────────────
   Body: { name: string, industry?: string }
   Behavior:
   - 201: Creates Organization + User row (linked by Supabase email)
          as 'admin'. Returns { organization, user }.
   - 401: not signed in to Supabase
   - 409: caller already has a Philly User row (the request would
          have created a second org for the same email; refuse so we
          don't accidentally fork a tenant). Use /philly for normal
          operation.
   - 429: rate-limited per Supabase user id (10 attempts / hour).

   Why this lives in the root /philly tree even though we have an
   identical route in apps/philly-standalone:
   The root app is what serves juandiazllc.com/philly/* in production.
   The standalone copy is for the DEUS-SHARED extraction. Bundle CZ
   keeps the two trees in parallel — same shape, same behavior. */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit } from '@/lib/philly/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Aggressive — onboarding-spam attempts should rate-limit on the
// first batch. 5 attempts / hour per authenticated user is more than
// enough for legitimate retries on validation errors.
const ONBOARDING_LIMIT = { capacity: 5, refillPerSec: 5 / 3600 } as const

const VALID_INDUSTRIES = ['general', 'realestate', 'hospitality', 'energy', 'csr'] as const

const schema = z.object({
  name: z.string().min(2).max(120).transform((s) => s.trim()),
  industry: z.enum(VALID_INDUSTRIES).default('general'),
  // Optional slug — auto-generated from name if omitted.
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase letters, digits, hyphens')
    .optional(),
})

export async function POST(req: NextRequest) {
  // 1. Supabase-only auth check — caller might not have a Prisma User
  //    row yet (that's what we're about to create).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = enforceRateLimit(`onboarding:create-org:${user.id}`, ONBOARDING_LIMIT)
  if (limited) return limited

  let body: unknown
  try { body = await req.json() } catch { return jsonError('Invalid JSON', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const prisma = getAuthPrisma()

  // 2. Refuse if the caller is already in an org. Re-running this for
  //    a known email would create a parallel tenant; the right path
  //    for "add a teammate" is /settings/users on the existing org.
  const existing = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, organizationId: true },
  })
  if (existing?.organizationId) {
    return NextResponse.json(
      { error: 'You already belong to an organization', code: 'ALREADY_ONBOARDED' },
      { status: 409 },
    )
  }

  // 3. Slug — derive from name if not supplied. Lowercase + strip
  //    non-alphanumeric + collapse hyphens. Append a 4-digit random
  //    suffix on collision rather than failing.
  const desiredSlug = parsed.data.slug ?? slugify(parsed.data.name)
  const slug = await ensureUniqueSlug(prisma, desiredSlug)

  // 4. Create org + user in one transaction. Sentinel passwordHash —
  //    auth lives in Supabase; the Prisma User row only exists to
  //    carry organizationId + role + dashboardSections.
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email.split('@')[0]

  try {
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: parsed.data.name, slug, industry: parsed.data.industry },
        select: { id: true, name: true, slug: true, industry: true },
      })
      const phillyUser = await tx.user.create({
        data: {
          email: user.email!,
          name: displayName,
          // Bundle CZ — Supabase owns auth; this column is never
          // checked but the schema requires it. Use a sentinel that
          // could never match a bcrypt hash.
          passwordHash: 'supabase-auth',
          role: 'admin',
          organizationId: organization.id,
        },
        select: { id: true, email: true, role: true },
      })
      return { organization, user: phillyUser }
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to create organization', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'workspace'
}

async function ensureUniqueSlug(
  prisma: ReturnType<typeof getAuthPrisma>,
  base: string,
): Promise<string> {
  let candidate = base
  for (let attempt = 0; attempt < 5; attempt++) {
    const hit = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!hit) return candidate
    candidate = `${base}-${Math.floor(1000 + Math.random() * 9000)}`
  }
  // Hit the retry cap — extremely unlikely; refuse rather than loop.
  throw new Error('Slug collision after 5 attempts')
}
