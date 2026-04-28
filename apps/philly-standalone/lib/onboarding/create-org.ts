/* ---------------------------------------------------------------
   Tenant-onboarding business logic.
   ---------------------------------------------------------------
   Extracted from app/api/onboarding/create-org/route.ts so the
   logic can be unit-tested without spinning up a Next.js request.
   The route is the HTTP shell (auth, rate-limit, body validation,
   audit log); this module is the actual "create org + admin user"
   transaction.
   --------------------------------------------------------------- */

export interface CreateOrgInput {
  email: string
  name: string
  slug?: string
  displayName?: string
}

export interface CreateOrgResult {
  organization: { id: string; name: string; slug: string }
  user: { id: string; email: string; role: string }
}

export type CreateOrgError =
  | { code: 'ALREADY_ONBOARDED' }
  | { code: 'SLUG_COLLISION' }

export interface OnboardingPrisma {
  user: {
    findUnique: (args: {
      where: { email: string }
      select: { id: true; organizationId: true }
    }) => Promise<{ id: string; organizationId: string | null } | null>
  }
  organization: {
    findUnique: (args: {
      where: { slug: string }
      select: { id: true }
    }) => Promise<{ id: string } | null>
  }
  $transaction: <T>(fn: (tx: OnboardingTxPrisma) => Promise<T>) => Promise<T>
}

export interface OnboardingTxPrisma {
  organization: {
    create: (args: {
      data: { name: string; slug: string }
      select: { id: true; name: true; slug: true }
    }) => Promise<{ id: string; name: string; slug: string }>
  }
  membership: {
    create: (args: {
      data: { userId: string; organizationId: string; role: string }
    }) => Promise<unknown>
  }
  user: {
    create: (args: {
      data: {
        email: string
        name: string
        role: string
        organizationId: string
        passwordHash: string
      }
      select: { id: true; role: true; email: true }
    }) => Promise<{ id: string; role: string; email: string }>
  }
}

export function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'org'
  )
}

/**
 * Pick a slug that does not collide with any existing organization.
 * Returns null if no free slug is available within the suffix budget
 * — caller should surface a 409 to the user rather than auto-mint a
 * 50-suffix name.
 */
export async function pickAvailableSlug(
  prisma: Pick<OnboardingPrisma, 'organization'>,
  base: string,
  maxAttempts = 50,
): Promise<string | null> {
  let candidate = base
  for (let i = 0; i < maxAttempts; i++) {
    const collision = await prisma.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!collision) return candidate
    candidate = `${base}-${i + 2}`
  }
  // Final check after the budget — if still colliding, give up.
  const final = await prisma.organization.findUnique({
    where: { slug: candidate },
    select: { id: true },
  })
  return final ? null : candidate
}

/**
 * Create a fresh tenant: Organization + admin User in one transaction.
 *
 * Idempotency: if `email` already has a User row, returns
 * { code: 'ALREADY_ONBOARDED' } rather than creating a second tenant.
 * This is the bug-prevention property that closed the multi-tenancy
 * leak (previously every new email auto-joined a shared default org).
 */
export async function createOrgAndAdmin(
  prisma: OnboardingPrisma,
  input: CreateOrgInput,
): Promise<CreateOrgResult | CreateOrgError> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, organizationId: true },
  })
  if (existing) return { code: 'ALREADY_ONBOARDED' }

  const baseSlug = input.slug ?? slugify(input.name)
  const slug = await pickAvailableSlug(prisma, baseSlug)
  if (!slug) return { code: 'SLUG_COLLISION' }

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: input.name, slug },
      select: { id: true, name: true, slug: true },
    })
    const user = await tx.user.create({
      data: {
        email: input.email,
        name: input.displayName?.trim() || input.email.split('@')[0],
        role: 'admin',
        organizationId: organization.id,
        passwordHash: '__supabase_auth__',
      },
      select: { id: true, role: true, email: true },
    })
    // Bundle G: also write the home-org Membership so the multi-org
    // listing endpoints have a uniform source of truth. The User row
    // still holds the home-org as the canonical primary, but every
    // org the user belongs to MUST have a Membership row.
    await tx.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'admin',
      },
    })
    return { organization, user }
  })
}
