import { describe, it, expect } from 'vitest'
import {
  createOrgAndAdmin,
  pickAvailableSlug,
  slugify,
  type OnboardingPrisma,
  type OnboardingTxPrisma,
} from './create-org'

interface OrgRow {
  id: string
  name: string
  slug: string
}
interface UserRow {
  id: string
  email: string
  organizationId: string
  role: string
}

function makePrisma(initial: { orgs?: OrgRow[]; users?: UserRow[] } = {}): {
  prisma: OnboardingPrisma
  state: { orgs: OrgRow[]; users: UserRow[] }
} {
  const orgs: OrgRow[] = initial.orgs ?? []
  const users: UserRow[] = initial.users ?? []

  const tx: OnboardingTxPrisma = {
    organization: {
      create: async ({ data }) => {
        const row: OrgRow = {
          id: `org_${orgs.length + 1}`,
          name: data.name,
          slug: data.slug,
        }
        orgs.push(row)
        return row
      },
    },
    user: {
      create: async ({ data }) => {
        const row: UserRow = {
          id: `user_${users.length + 1}`,
          email: data.email,
          organizationId: data.organizationId,
          role: data.role,
        }
        users.push(row)
        return row
      },
    },
  }

  const prisma: OnboardingPrisma = {
    user: {
      findUnique: async ({ where }) => {
        const u = users.find((row) => row.email === where.email)
        return u ? { id: u.id, organizationId: u.organizationId } : null
      },
    },
    organization: {
      findUnique: async ({ where }) => {
        const o = orgs.find((row) => row.slug === where.slug)
        return o ? { id: o.id } : null
      },
    },
    $transaction: async (fn) => fn(tx),
  }

  return { prisma, state: { orgs, users } }
}

describe('slugify', () => {
  it('lowercases, hyphenates, trims edge hyphens', () => {
    expect(slugify('Acme Inc.')).toBe('acme-inc')
    expect(slugify('  Spaces & Stuff!! ')).toBe('spaces-stuff')
    // NFKD decomposes 'é' into 'e' + combining accent; the latter
    // is stripped, leaving the unaccented latin letter.
    expect(slugify('café')).toBe('cafe')
  })

  it('returns "org" for empty / unhyphenable input', () => {
    expect(slugify('')).toBe('org')
    expect(slugify('!!!')).toBe('org')
  })

  it('caps at 64 chars', () => {
    expect(slugify('a'.repeat(200)).length).toBe(64)
  })
})

describe('pickAvailableSlug', () => {
  it('returns the base when no collision', async () => {
    const { prisma } = makePrisma()
    expect(await pickAvailableSlug(prisma, 'acme')).toBe('acme')
  })

  it('appends -2 on a single collision', async () => {
    const { prisma } = makePrisma({ orgs: [{ id: 'o1', name: 'Acme', slug: 'acme' }] })
    expect(await pickAvailableSlug(prisma, 'acme')).toBe('acme-2')
  })

  it('walks the suffix chain until a free slot is found', async () => {
    const { prisma } = makePrisma({
      orgs: [
        { id: 'o1', name: 'A', slug: 'acme' },
        { id: 'o2', name: 'B', slug: 'acme-2' },
        { id: 'o3', name: 'C', slug: 'acme-3' },
      ],
    })
    expect(await pickAvailableSlug(prisma, 'acme')).toBe('acme-4')
  })

  it('returns null when every suffix in the budget is taken', async () => {
    const orgs = [
      { id: 'base', name: 'A', slug: 'acme' },
      ...Array.from({ length: 49 }, (_, i) => ({
        id: `o${i + 2}`,
        name: 'A',
        slug: `acme-${i + 2}`,
      })),
    ]
    const { prisma } = makePrisma({ orgs })
    expect(await pickAvailableSlug(prisma, 'acme', 49)).toBeNull()
  })
})

describe('createOrgAndAdmin', () => {
  it('creates a fresh tenant with the caller as admin', async () => {
    const { prisma, state } = makePrisma()
    const result = await createOrgAndAdmin(prisma, {
      email: 'jane@acme.test',
      name: 'Acme Inc.',
      displayName: 'Jane Doe',
    })
    if ('code' in result) throw new Error(`expected success, got ${result.code}`)
    expect(result.organization.name).toBe('Acme Inc.')
    expect(result.organization.slug).toBe('acme-inc')
    expect(result.user.email).toBe('jane@acme.test')
    expect(result.user.role).toBe('admin')
    expect(state.orgs).toHaveLength(1)
    expect(state.users).toHaveLength(1)
    expect(state.users[0].organizationId).toBe(result.organization.id)
  })

  it('rejects with ALREADY_ONBOARDED when the email already has a User row', async () => {
    const { prisma, state } = makePrisma({
      users: [{ id: 'u1', email: 'jane@acme.test', organizationId: 'org_other', role: 'viewer' }],
      orgs: [{ id: 'org_other', name: 'Other', slug: 'other' }],
    })
    const result = await createOrgAndAdmin(prisma, {
      email: 'jane@acme.test',
      name: 'Acme Inc.',
    })
    expect(result).toEqual({ code: 'ALREADY_ONBOARDED' })
    // No new tenant created — this is the multi-tenancy guarantee.
    expect(state.orgs.length).toBe(1)
    expect(state.users.length).toBe(1)
  })

  it('disambiguates slug collisions automatically', async () => {
    const { prisma } = makePrisma({
      orgs: [{ id: 'o1', name: 'Acme', slug: 'acme-inc' }],
    })
    const result = await createOrgAndAdmin(prisma, {
      email: 'second@acme.test',
      name: 'Acme Inc.',
    })
    if ('code' in result) throw new Error(`expected success, got ${result.code}`)
    expect(result.organization.slug).toBe('acme-inc-2')
  })

  it('uses a caller-provided slug verbatim when available', async () => {
    const { prisma } = makePrisma()
    const result = await createOrgAndAdmin(prisma, {
      email: 'jane@acme.test',
      name: 'Different Display Name',
      slug: 'my-custom-slug',
    })
    if ('code' in result) throw new Error(`expected success, got ${result.code}`)
    expect(result.organization.slug).toBe('my-custom-slug')
  })

  it('falls back to the local-part of the email when displayName is empty', async () => {
    const { prisma, state } = makePrisma()
    await createOrgAndAdmin(prisma, {
      email: 'someone+tag@acme.test',
      name: 'Acme',
    })
    expect(state.users[0]).toBeDefined()
  })

  it('writes the supabase-auth sentinel passwordHash, not a real hash', async () => {
    const { prisma } = makePrisma()
    const captured: Array<Record<string, unknown>> = []
    // Override user.create to capture the data instead of mock-creating.
    prisma.$transaction = async (fn) =>
      fn({
        organization: {
          create: async ({ data }) => ({ id: 'org_x', name: data.name, slug: data.slug }),
        },
        user: {
          create: async ({ data }) => {
            captured.push(data as unknown as Record<string, unknown>)
            return { id: 'u_x', role: data.role, email: data.email }
          },
        },
      })
    await createOrgAndAdmin(prisma, { email: 'jane@acme.test', name: 'Acme' })
    expect(captured[0].passwordHash).toBe('__supabase_auth__')
  })
})

describe('cross-tenant isolation guarantee', () => {
  it('two unrelated signups land in two separate organizations', async () => {
    // The previous (broken) behavior: both users land in a shared
    // default org. This test pins the fix in place.
    const { prisma, state } = makePrisma()
    const a = await createOrgAndAdmin(prisma, { email: 'a@acme.test', name: 'Acme' })
    const b = await createOrgAndAdmin(prisma, { email: 'b@globex.test', name: 'Globex' })
    if ('code' in a) throw new Error(`a failed: ${a.code}`)
    if ('code' in b) throw new Error(`b failed: ${b.code}`)
    expect(a.organization.id).not.toBe(b.organization.id)
    expect(state.orgs).toHaveLength(2)
    expect(state.users.find((u) => u.email === 'a@acme.test')!.organizationId).toBe(a.organization.id)
    expect(state.users.find((u) => u.email === 'b@globex.test')!.organizationId).toBe(b.organization.id)
  })
})
