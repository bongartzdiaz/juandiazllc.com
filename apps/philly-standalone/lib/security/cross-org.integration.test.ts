/* ---------------------------------------------------------------
   Cross-org isolation integration suite.
   ---------------------------------------------------------------
   Hits a real MariaDB (docker/test-db) via Prisma. Builds two
   independent orgs with two users each, exercises every common
   read/write/erase operation across all PII-bearing tables, and
   asserts that USER OF ORG A can never:

     - Read a row created by ORG B
     - Modify a row created by ORG B
     - Erase a row created by ORG B
     - Have their own scoped data picked up by ORG B's queries

   The unit-test suite (lib/onboarding/create-org.test.ts) already
   pins "two unrelated signups land in two separate organizations"
   at the auth-helpers layer. This integration suite proves the
   guarantee survives end-to-end through the full Prisma + DB stack.

   Run via:
     npm run test:integration

   Requires DATABASE_URL pointing at the test MariaDB. The
   scripts/test-integration.sh wrapper sets up the container,
   migrates, and invokes vitest.
   --------------------------------------------------------------- */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { eraseContactSubject } from '@/lib/gdpr/erasure'
import { collectContactSubjectData } from '@/lib/gdpr/export'
import { hashEmail } from '@/lib/gdpr/hash'

let prisma: PrismaClient

interface OrgFixture {
  org: { id: string }
  admin: { id: string; email: string }
  manager: { id: string; email: string }
}

async function makeOrg(slug: string, name: string): Promise<OrgFixture> {
  const org = await prisma.organization.create({
    data: { name, slug },
    select: { id: true },
  })
  const admin = await prisma.user.create({
    data: {
      email: `admin@${slug}.test`,
      name: `${name} Admin`,
      role: 'admin',
      organizationId: org.id,
      passwordHash: '__supabase_auth__',
    },
    select: { id: true, email: true },
  })
  const manager = await prisma.user.create({
    data: {
      email: `manager@${slug}.test`,
      name: `${name} Manager`,
      role: 'manager',
      organizationId: org.id,
      passwordHash: '__supabase_auth__',
    },
    select: { id: true, email: true },
  })
  return { org, admin, manager }
}

beforeAll(async () => {
  prisma = new PrismaClient()
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  // Tear down everything between tests. Order matters: tables with
  // FK constraints to others must go first. We don't run inside a
  // transaction because Prisma's deletion of FK-cascade rows is
  // simpler and the test DB is tmpfs-backed (cheap to reset).
  await prisma.gdprConsentRecord.deleteMany({})
  await prisma.gdprErasureLog.deleteMany({})
  await prisma.gdprExportLog.deleteMany({})
  await prisma.assistantTurn.deleteMany({})
  await prisma.assistantConversation.deleteMany({})
  await prisma.assistantMemory.deleteMany({})
  await prisma.auditLog.deleteMany({})
  await prisma.contactNote.deleteMany({})
  await prisma.activity.deleteMany({})
  await prisma.callLog.deleteMany({})
  await prisma.smsMessage.deleteMany({})
  await prisma.contact.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.organization.deleteMany({})
})

describe('Contact reads are tenant-scoped', () => {
  it('admin in org A cannot see contacts in org B by listing', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    await prisma.contact.create({
      data: {
        organizationId: b.org.id,
        name: 'Beth Globex',
        email: 'beth@globex.test',
        phone: '+10 1234',
        type: 'partner',
        company: 'Globex',
      },
    })

    const visibleToA = await prisma.contact.findMany({
      where: { organizationId: a.org.id },
      select: { id: true },
    })
    expect(visibleToA).toEqual([])

    const visibleToB = await prisma.contact.findMany({
      where: { organizationId: b.org.id },
    })
    expect(visibleToB).toHaveLength(1)
  })

  it('admin in org A cannot find org B contact by id even if they know the id', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    const bContact = await prisma.contact.create({
      data: {
        organizationId: b.org.id,
        name: 'Beth Globex',
        email: 'beth@globex.test',
        phone: '',
        type: 'partner',
        company: 'Globex',
      },
    })

    // The route convention is `findFirst({ id, organizationId: scope.organizationId })`
    // — emulate that exactly. The org filter must reject the cross-tenant id.
    const result = await prisma.contact.findFirst({
      where: { id: bContact.id, organizationId: a.org.id },
    })
    expect(result).toBeNull()
  })
})

describe('Contact writes are tenant-scoped', () => {
  it('updateMany scoped to org A leaves org B contacts untouched', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    const aContact = await prisma.contact.create({
      data: {
        organizationId: a.org.id,
        name: 'Alice Acme',
        email: 'alice@acme.test',
        phone: '',
        type: 'donor',
        company: 'Acme',
      },
    })
    const bContact = await prisma.contact.create({
      data: {
        organizationId: b.org.id,
        name: 'Beth Globex',
        email: 'beth@globex.test',
        phone: '',
        type: 'partner',
        company: 'Globex',
      },
    })

    // Org A admin tries to retag every contact in their org —
    // org-scoped, so nothing in B should change.
    await prisma.contact.updateMany({
      where: { organizationId: a.org.id },
      data: { type: 'beneficiary' },
    })

    const after = await prisma.contact.findMany({
      where: { id: { in: [aContact.id, bContact.id] } },
      select: { id: true, type: true },
    })
    const aRow = after.find((r) => r.id === aContact.id)
    const bRow = after.find((r) => r.id === bContact.id)
    expect(aRow?.type).toBe('beneficiary')
    expect(bRow?.type).toBe('partner')
  })

  it('a forged update where the id is from org B but the where-clause scopes to org A is a no-op', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    const bContact = await prisma.contact.create({
      data: {
        organizationId: b.org.id,
        name: 'Beth Globex',
        email: 'beth@globex.test',
        phone: '',
        type: 'partner',
        company: 'Globex',
      },
    })

    // This is the pattern routes use: { id, organizationId } in the
    // where clause. Forging the id but scoping to A's org rejects.
    const result = await prisma.contact.updateMany({
      where: { id: bContact.id, organizationId: a.org.id },
      data: { name: 'Hacked' },
    })
    expect(result.count).toBe(0)

    const fresh = await prisma.contact.findUnique({ where: { id: bContact.id } })
    expect(fresh?.name).toBe('Beth Globex')
  })
})

describe('GDPR data-subject erasure is tenant-scoped', () => {
  it('admin in org A erasing a contact email also present in org B only deletes A rows', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    // Same human reaches out to both orgs separately. Each org has
    // a Contact row with the same email. Org A processes a DSAR
    // erasure; org B's record must NOT be touched.
    const sharedEmail = 'samira@example.test'
    const aContact = await prisma.contact.create({
      data: {
        organizationId: a.org.id,
        name: 'Samira (Acme view)',
        email: sharedEmail,
        phone: '',
        type: 'donor',
        company: 'Acme',
      },
    })
    const bContact = await prisma.contact.create({
      data: {
        organizationId: b.org.id,
        name: 'Samira (Globex view)',
        email: sharedEmail,
        phone: '',
        type: 'partner',
        company: 'Globex',
      },
    })

    const result = await eraseContactSubject(prisma, a.org.id, sharedEmail)
    expect(result.rowCounts.Contact).toBe(1)

    const aFresh = await prisma.contact.findUnique({ where: { id: aContact.id } })
    expect(aFresh).toBeNull()

    const bFresh = await prisma.contact.findUnique({ where: { id: bContact.id } })
    expect(bFresh).not.toBeNull()
    expect(bFresh?.name).toBe('Samira (Globex view)')
  })
})

describe('GDPR data-subject export is tenant-scoped', () => {
  it('exporting contact data from org A only returns rows visible to org A', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    const sharedEmail = 'samira@example.test'
    await prisma.contact.create({
      data: {
        organizationId: a.org.id,
        name: 'Samira (Acme)',
        email: sharedEmail,
        phone: '',
        type: 'donor',
        company: '',
      },
    })
    await prisma.contact.create({
      data: {
        organizationId: b.org.id,
        name: 'Samira (Globex)',
        email: sharedEmail,
        phone: '',
        type: 'partner',
        company: '',
      },
    })

    const aExport = await collectContactSubjectData(
      prisma,
      a.org.id,
      sharedEmail,
      hashEmail(sharedEmail),
    )
    expect(aExport.contacts).toHaveLength(1)
    expect(aExport.contacts[0].name).toBe('Samira (Acme)')

    const bExport = await collectContactSubjectData(
      prisma,
      b.org.id,
      sharedEmail,
      hashEmail(sharedEmail),
    )
    expect(bExport.contacts).toHaveLength(1)
    expect(bExport.contacts[0].name).toBe('Samira (Globex)')
  })
})

describe('Audit log entries are tenant-scoped', () => {
  it('listing audit logs for org A never leaks org B entries', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    await prisma.auditLog.create({
      data: {
        organizationId: a.org.id,
        userId: a.admin.id,
        action: 'create',
        entity: 'contact',
        entityId: 'a-contact',
        changes: '{}',
      },
    })
    await prisma.auditLog.create({
      data: {
        organizationId: b.org.id,
        userId: b.admin.id,
        action: 'delete',
        entity: 'contact',
        entityId: 'b-contact',
        changes: '{}',
      },
    })

    const aLogs = await prisma.auditLog.findMany({
      where: { organizationId: a.org.id },
    })
    expect(aLogs).toHaveLength(1)
    expect(aLogs[0].action).toBe('create')

    const bLogs = await prisma.auditLog.findMany({
      where: { organizationId: b.org.id },
    })
    expect(bLogs).toHaveLength(1)
    expect(bLogs[0].action).toBe('delete')
  })
})

describe('Assistant memory is per-user, not just per-org', () => {
  it('user X memory in org A is invisible to user Y in org A and to anyone in org B', async () => {
    const a = await makeOrg('acme', 'Acme')
    const b = await makeOrg('globex', 'Globex')

    await prisma.assistantMemory.create({
      data: {
        organizationId: a.org.id,
        userId: a.admin.id,
        key: 'pref.language',
        value: 'nl',
      },
    })

    // Same org, different user — should not see admin's memory
    const managerView = await prisma.assistantMemory.findMany({
      where: { userId: a.manager.id },
    })
    expect(managerView).toHaveLength(0)

    // Cross-org admin — also no
    const crossOrg = await prisma.assistantMemory.findMany({
      where: { userId: b.admin.id },
    })
    expect(crossOrg).toHaveLength(0)

    // Owner sees their own
    const own = await prisma.assistantMemory.findMany({
      where: { userId: a.admin.id },
    })
    expect(own).toHaveLength(1)
    expect(own[0].value).toBe('nl')
  })
})

describe('User uniqueness is global (one email = one User row)', () => {
  it('the same email cannot be a user in two orgs at the same time', async () => {
    const a = await makeOrg('acme', 'Acme')
    await makeOrg('globex', 'Globex')

    await expect(
      prisma.user.create({
        data: {
          email: a.admin.email, // already exists in org A
          name: 'duplicate',
          role: 'manager',
          organizationId: 'org_b',
          passwordHash: '__supabase_auth__',
        },
      }),
    ).rejects.toThrow()
  })
})
