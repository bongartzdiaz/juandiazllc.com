import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

// Mutable org count the mocked Prisma closes over.
const h = vi.hoisted(() => ({ orgCount: 0 }))

// auth-helpers (transitively imported for jsonError/AuthScope) pulls in the
// Supabase server client — stub it so importing the guard doesn't touch env.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }),
}))
vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({ organization: { count: async () => h.orgCount } }),
}))
vi.mock('@/lib/philly/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { denyIfNotOutreachOperator, outreachOperatorOrgIds } from './outreach-guard'

const ENV = 'OUTREACH_OPERATOR_ORG_IDS'
const scope = (organizationId: string) =>
  ({ userId: 'u1', organizationId, role: 'admin', email: 'a@b.c' }) as never

const orig = process.env[ENV]
const restoreEnv = () => {
  if (orig === undefined) delete process.env[ENV]
  else process.env[ENV] = orig
}

describe('outreachOperatorOrgIds', () => {
  afterEach(restoreEnv)

  it('returns [] when unset', () => {
    delete process.env[ENV]
    expect(outreachOperatorOrgIds()).toEqual([])
  })

  it('parses a comma-separated list, trimming and dropping blanks', () => {
    process.env[ENV] = ' org-a , org-b ,, org-c '
    expect(outreachOperatorOrgIds()).toEqual(['org-a', 'org-b', 'org-c'])
  })
})

describe('denyIfNotOutreachOperator', () => {
  beforeEach(() => {
    h.orgCount = 0
  })
  afterEach(restoreEnv)

  it('allows an org that is on the allowlist', async () => {
    process.env[ENV] = 'op-org'
    expect(await denyIfNotOutreachOperator(scope('op-org'))).toBeNull()
  })

  it('denies (404) an org that is not on the allowlist', async () => {
    process.env[ENV] = 'op-org'
    const res = await denyIfNotOutreachOperator(scope('intruder-org'))
    expect(res).toBeInstanceOf(NextResponse)
    expect(res?.status).toBe(404)
  })

  it('honors the allowlist regardless of org count (no fallback when configured)', async () => {
    process.env[ENV] = 'op-org'
    h.orgCount = 99
    expect(await denyIfNotOutreachOperator(scope('op-org'))).toBeNull()
    const res = await denyIfNotOutreachOperator(scope('other'))
    expect(res?.status).toBe(404)
  })

  it('with no allowlist, allows a single-org (genuinely single-tenant) deploy', async () => {
    delete process.env[ENV]
    h.orgCount = 1
    expect(await denyIfNotOutreachOperator(scope('only-org'))).toBeNull()
  })

  it('with no allowlist, allows a zero-org (fresh) deploy', async () => {
    delete process.env[ENV]
    h.orgCount = 0
    expect(await denyIfNotOutreachOperator(scope('any'))).toBeNull()
  })

  it('with no allowlist, denies (404) once a 2nd org exists — the customer-#2 case', async () => {
    delete process.env[ENV]
    h.orgCount = 2
    const res = await denyIfNotOutreachOperator(scope('any'))
    expect(res).toBeInstanceOf(NextResponse)
    expect(res?.status).toBe(404)
  })
})
