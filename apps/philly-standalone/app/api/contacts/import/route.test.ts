/* Hermetic route tests — POST /api/contacts/import
   ─────────────────────────────────────────────────
   Pins down the contract for the CSV / XLSX bulk-import pipeline.
   Verifies:
     - requireSection() gates the route (manager+ only)
     - zod schema rejects bad input (no rows, no mapping, >500 rows)
     - per-row validation (name required, email shape)
     - dedupe against DB by emailHash + phoneHash
     - dedupe within the upload batch (duplicate rows collapse)
     - dryRun returns counts without writing
     - successful import writes via prisma.contact.create + emits ONE
       audit row with the right counts encoded in `changes`

   All mocks at module-boundary so the route is exercised end-to-end. */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSectionMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
  contactFindManyMock: vi.fn(),
  contactCreateMock: vi.fn(),
  logAuditMock: vi.fn(),
  publishMock: vi.fn(),
  encryptPiiMock: vi.fn((s: string | null) => (s ? `enc:${s}` : null)),
  hashEmailMock: vi.fn((s: string) => (s ? `eh:${s}` : null)),
  hashPhoneMock: vi.fn((s: string) => (s ? `ph:${s}` : null)),
}))

vi.mock('@/lib/philly/auth-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/philly/auth-helpers')>(
    '@/lib/philly/auth-helpers',
  )
  return {
    ...actual,
    requireSection: (...args: unknown[]) => mocks.requireSectionMock(...args),
  }
})

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    contact: {
      findMany: (...args: unknown[]) => mocks.contactFindManyMock(...args),
      create: (...args: unknown[]) => mocks.contactCreateMock(...args),
    },
  }),
}))

vi.mock('@/lib/philly/audit', () => ({
  logAudit: (...args: unknown[]) => mocks.logAuditMock(...args),
}))

vi.mock('@/lib/philly/rate-limit', () => ({
  enforceRateLimit: (...args: unknown[]) => mocks.enforceRateLimitMock(...args),
  PRESET_MUTATION: { tokensPerWindow: 100, windowMs: 60_000 },
}))

vi.mock('@/lib/philly/realtime/publish', () => ({
  publishEntityCreated: (...args: unknown[]) => mocks.publishMock(...args),
}))

vi.mock('@/lib/philly/pii', () => ({
  encryptPii: (s: string | null) => mocks.encryptPiiMock(s),
}))

vi.mock('@/lib/philly/blind-index', () => ({
  hashEmail: (s: string) => mocks.hashEmailMock(s),
  hashPhone: (s: string) => mocks.hashPhoneMock(s),
}))

// next/server's `after()` shim — in tests we just invoke synchronously.
vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: (fn: () => void | Promise<void>) => { void fn() },
  }
})

// ── Import under test (after mocks are registered) ─────────────────

import { POST } from './route'

const SCOPE = {
  userId: 'u1',
  organizationId: 'org1',
  role: 'manager',
} as const

function makeReq(body: unknown): Request {
  return new Request('http://x/api/contacts/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function callPost(body: unknown) {
  // The route's NextRequest type narrows from Request — passing a plain Request
  // works at runtime because POST only uses .json() + headers.
  return POST(makeReq(body) as never)
}

describe('POST /api/contacts/import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireSectionMock.mockResolvedValue(SCOPE)
    mocks.enforceRateLimitMock.mockReturnValue(null)
    mocks.contactFindManyMock.mockResolvedValue([])
    mocks.contactCreateMock.mockImplementation(({ data }: { data: { name: string } }) =>
      Promise.resolve({ id: `id-${data.name}`, ...data }),
    )
    mocks.logAuditMock.mockResolvedValue(undefined)
    mocks.encryptPiiMock.mockImplementation((s: string | null) => (s ? `enc:${s}` : null))
    mocks.hashEmailMock.mockImplementation((s: string) => (s ? `eh:${s}` : null))
    mocks.hashPhoneMock.mockImplementation((s: string) => (s ? `ph:${s}` : null))
  })

  it('gates on requireSection — returns whatever scope returns when it is a NextResponse', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    mocks.requireSectionMock.mockResolvedValueOnce(forbidden)
    const res = await callPost({ rows: [{ a: 'b' }], mapping: { name: 'a' } })
    expect(res.status).toBe(403)
    expect(mocks.contactCreateMock).not.toHaveBeenCalled()
  })

  it('rejects empty rows', async () => {
    const res = await callPost({ rows: [], mapping: { name: 'Name' } })
    expect(res.status).toBe(400)
    expect(mocks.contactCreateMock).not.toHaveBeenCalled()
  })

  it('rejects more than 500 rows', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ Name: `c${i}` }))
    const res = await callPost({ rows, mapping: { name: 'Name' } })
    expect(res.status).toBe(400)
  })

  it('rejects rows where the mapped name column is empty', async () => {
    const res = await callPost({
      rows: [{ Name: 'Alice' }, { Name: '' }, { Name: '   ' }],
      mapping: { name: 'Name' },
    })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.data.created).toBe(1)
    expect(json.data.failedValidation).toBe(2)
    expect(json.data.errors).toHaveLength(2)
    expect(json.data.errors[0].row).toBe(2)
    expect(json.data.errors[1].row).toBe(3)
  })

  it('rejects malformed email shape', async () => {
    const res = await callPost({
      rows: [{ Name: 'A', Email: 'not-an-email' }],
      mapping: { name: 'Name', email: 'Email' },
    })
    const json = await res.json()
    expect(json.data.failedValidation).toBe(1)
    expect(json.data.errors[0].reason).toMatch(/invalid email/i)
  })

  it('dedupes against existing emails in the DB (default both)', async () => {
    mocks.contactFindManyMock.mockResolvedValueOnce([
      { emailHash: 'eh:alice@a.com', phoneHash: null },
    ])
    const res = await callPost({
      rows: [
        { Name: 'Alice', Email: 'alice@a.com' },
        { Name: 'Bob', Email: 'bob@b.com' },
      ],
      mapping: { name: 'Name', email: 'Email' },
    })
    const json = await res.json()
    expect(json.data.created).toBe(1)
    expect(json.data.skippedDuplicate).toBe(1)
    expect(mocks.contactCreateMock).toHaveBeenCalledTimes(1)
    const created = mocks.contactCreateMock.mock.calls[0][0].data
    expect(created.name).toBe('Bob')
  })

  it('dedupes within the upload batch — second row with same email collapses', async () => {
    const res = await callPost({
      rows: [
        { Name: 'Alice', Email: 'alice@a.com' },
        { Name: 'Alice2', Email: 'alice@a.com' },
      ],
      mapping: { name: 'Name', email: 'Email' },
    })
    const json = await res.json()
    expect(json.data.created).toBe(1)
    expect(json.data.skippedDuplicate).toBe(1)
  })

  it('respects dedupeOn: none — no DB lookup, no batch dedup', async () => {
    const res = await callPost({
      rows: [
        { Name: 'Alice', Email: 'a@a.com' },
        { Name: 'Alice2', Email: 'a@a.com' },
      ],
      mapping: { name: 'Name', email: 'Email' },
      dedupeOn: 'none',
    })
    const json = await res.json()
    expect(json.data.created).toBe(2)
    expect(json.data.skippedDuplicate).toBe(0)
    expect(mocks.contactFindManyMock).not.toHaveBeenCalled()
  })

  it('dryRun: true returns counts without writes', async () => {
    const res = await callPost({
      rows: [
        { Name: 'Alice', Email: 'a@a.com' },
        { Name: 'Bob' },
      ],
      mapping: { name: 'Name', email: 'Email' },
      dryRun: true,
    })
    const json = await res.json()
    expect(json.data.created).toBe(2)
    expect(mocks.contactCreateMock).not.toHaveBeenCalled()
    expect(mocks.logAuditMock).not.toHaveBeenCalled()
  })

  it('writes ONE audit row per import with counts encoded in `changes`', async () => {
    mocks.contactFindManyMock.mockResolvedValueOnce([
      { emailHash: 'eh:dup@x.com', phoneHash: null },
    ])
    await callPost({
      rows: [
        { Name: 'A', Email: 'a@a.com' },
        { Name: '', Email: 'invalid' },         // failedValidation
        { Name: 'Dup', Email: 'dup@x.com' },    // skippedDuplicate
      ],
      mapping: { name: 'Name', email: 'Email' },
    })
    expect(mocks.logAuditMock).toHaveBeenCalledTimes(1)
    const call = mocks.logAuditMock.mock.calls[0][0]
    expect(call.action).toBe('import')
    expect(call.entity).toBe('contact')
    expect(call.entityId).toBe('bulk')
    expect(call.changes).toEqual({
      total:            { old: 0, new: 3 },
      created:          { old: 0, new: 1 },
      skippedDuplicate: { old: 0, new: 1 },
      failedValidation: { old: 0, new: 1 },
    })
  })

  it('encrypts email + phone via encryptPii, hashes via blind-index', async () => {
    await callPost({
      rows: [{ Name: 'A', Email: 'a@a.com', Phone: '+31612345678' }],
      mapping: { name: 'Name', email: 'Email', phone: 'Phone' },
    })
    const created = mocks.contactCreateMock.mock.calls[0][0].data
    expect(created.email).toBe('enc:a@a.com')
    expect(created.phone).toBe('enc:+31612345678')
    expect(created.emailHash).toBe('eh:a@a.com')
    expect(created.phoneHash).toBe('ph:+31612345678')
  })

  it('rate-limit short-circuits before any work', async () => {
    const limited = NextResponse.json({ error: 'rate-limited' }, { status: 429 })
    mocks.enforceRateLimitMock.mockReturnValueOnce(limited)
    const res = await callPost({ rows: [{ N: 'A' }], mapping: { name: 'N' } })
    expect(res.status).toBe(429)
    expect(mocks.contactCreateMock).not.toHaveBeenCalled()
    expect(mocks.logAuditMock).not.toHaveBeenCalled()
  })
})
