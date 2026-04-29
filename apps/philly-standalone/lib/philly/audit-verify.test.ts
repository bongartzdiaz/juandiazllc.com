import { describe, it, expect } from 'vitest'
import { computeAuditHash } from './audit-chain'
import { verifyAuditChain, type PrismaForVerify } from './audit-verify'

interface Row {
  id: string
  organizationId: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  changes: string
  createdAt: Date
  hash: string | null
  prevHash: string | null
}

function row(id: string, prevHash: string | null, overrides: Partial<Row> = {}): Row {
  const base: Row = {
    id,
    organizationId: 'org1',
    userId: 'u1',
    action: 'create',
    entity: 'contact',
    entityId: `c-${id}`,
    changes: '{}',
    createdAt: new Date(`2026-04-29T10:0${id}:00Z`),
    hash: null,
    prevHash,
  }
  const merged = { ...base, ...overrides }
  // Compute the canonical hash unless an explicit hash was supplied.
  if (overrides.hash === undefined) {
    merged.hash = computeAuditHash(prevHash, merged)
  }
  return merged
}

function fakePrisma(rows: Row[]): PrismaForVerify {
  return {
    auditLog: {
      findMany: async () => rows,
    },
  }
}

describe('verifyAuditChain', () => {
  it('reports ok=true on a clean three-row chain', async () => {
    const r1 = row('1', null)
    const r2 = row('2', r1.hash)
    const r3 = row('3', r2.hash)
    const report = await verifyAuditChain(fakePrisma([r1, r2, r3]), 'org1')

    expect(report.ok).toBe(true)
    expect(report.totalRows).toBe(3)
    expect(report.hashedRows).toBe(3)
    expect(report.unhashedRows).toBe(0)
    expect(report.broken).toEqual([])
    expect(report.forked).toEqual([])
    expect(report.lastHash).toBe(r3.hash)
  })

  it('flags a tampered row in broken[] and sets ok=false', async () => {
    const r1 = row('1', null)
    const r2 = row('2', r1.hash, { changes: '{"original":true}' })
    // Tamper after-the-fact: change changes but keep the original hash.
    const tampered: Row = { ...r2, changes: '{"tampered":true}' }
    const r3 = row('3', tampered.hash)

    const report = await verifyAuditChain(fakePrisma([r1, tampered, r3]), 'org1')

    expect(report.ok).toBe(false)
    expect(report.broken).toEqual([{ id: '2', reason: 'hash-mismatch' }])
  })

  it('flags an orphan prevHash in forked[] but keeps ok=true', async () => {
    const r1 = row('1', null)
    // r2 claims a prevHash that has no producer in the chain
    const r2 = row('2', 'deadbeef'.repeat(8))
    const report = await verifyAuditChain(fakePrisma([r1, r2]), 'org1')

    expect(report.ok).toBe(true) // forks aren't broken hashes
    expect(report.forked).toEqual([{ id: '2', reason: 'orphan-prev' }])
  })

  it('counts unhashed rows separately and excludes them from chain verification', async () => {
    const legacy: Row = row('1', null, { hash: null })
    const r2 = row('2', null) // valid post-rollout root
    const report = await verifyAuditChain(fakePrisma([legacy, r2]), 'org1')

    expect(report.totalRows).toBe(2)
    expect(report.unhashedRows).toBe(1)
    expect(report.hashedRows).toBe(1)
    expect(report.ok).toBe(true)
    expect(report.lastHash).toBe(r2.hash)
  })

  it('handles an empty chain', async () => {
    const report = await verifyAuditChain(fakePrisma([]), 'org1')
    expect(report.ok).toBe(true)
    expect(report.totalRows).toBe(0)
    expect(report.lastHash).toBeNull()
  })

  it('returns the LAST hashed row as lastHash', async () => {
    const r1 = row('1', null)
    const r2 = row('2', r1.hash)
    const report = await verifyAuditChain(fakePrisma([r1, r2]), 'org1')
    expect(report.lastHash).toBe(r2.hash)
  })

  it('passes the organizationId through to the report', async () => {
    const report = await verifyAuditChain(fakePrisma([]), 'tenant-42')
    expect(report.organizationId).toBe('tenant-42')
  })
})
