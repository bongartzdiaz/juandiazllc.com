import { describe, it, expect } from 'vitest'
import { canonicalJson, computeAuditHash, type AuditChainRow } from './audit-chain'
import { verifyAuditChain } from './audit-verify'

describe('canonicalJson', () => {
  it('sorts object keys deterministically', () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }))
  })

  it('sorts nested object keys recursively', () => {
    expect(canonicalJson({ x: { b: 1, a: 2 }, y: 0 })).toBe('{"x":{"a":2,"b":1},"y":0}')
  })

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]')
  })

  it('handles primitives + null', () => {
    expect(canonicalJson(42)).toBe('42')
    expect(canonicalJson('hi')).toBe('"hi"')
    expect(canonicalJson(null)).toBe('null')
  })
})

const baseRow: AuditChainRow = {
  organizationId: 'org1',
  userId: 'u1',
  action: 'create',
  entity: 'contact',
  entityId: 'c1',
  changes: '{}',
  createdAt: new Date('2026-04-25T00:00:00Z'),
}

describe('computeAuditHash', () => {
  it('is deterministic for the same inputs', () => {
    const a = computeAuditHash(null, baseRow)
    const b = computeAuditHash(null, baseRow)
    expect(a).toBe(b)
  })

  it('produces a 64-char hex digest', () => {
    expect(computeAuditHash(null, baseRow)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('changes when prevHash changes (chain coupling)', () => {
    const noPrev = computeAuditHash(null, baseRow)
    const withPrev = computeAuditHash('a'.repeat(64), baseRow)
    expect(noPrev).not.toBe(withPrev)
  })

  it('changes when ANY content field changes', () => {
    const ref = computeAuditHash(null, baseRow)
    expect(computeAuditHash(null, { ...baseRow, action: 'update' })).not.toBe(ref)
    expect(computeAuditHash(null, { ...baseRow, entity: 'project' })).not.toBe(ref)
    expect(computeAuditHash(null, { ...baseRow, changes: '{"x":1}' })).not.toBe(ref)
    expect(computeAuditHash(null, { ...baseRow, createdAt: new Date('2026-04-26') })).not.toBe(ref)
  })
})

interface VerifyRow {
  id: string
  organizationId: string
  userId: string
  action: string
  entity: string
  entityId: string | null
  changes: string
  createdAt: Date
  prevHash: string | null
  hash: string | null
}

function buildChain(): VerifyRow[] {
  // Three rows in a valid chain.
  const r1: VerifyRow = {
    id: 'r1',
    organizationId: 'org1',
    userId: 'u1',
    action: 'create',
    entity: 'contact',
    entityId: 'c1',
    changes: '{}',
    createdAt: new Date('2026-04-25T00:00:01Z'),
    prevHash: null,
    hash: '',
  }
  r1.hash = computeAuditHash(null, r1)
  const r2: VerifyRow = {
    id: 'r2',
    organizationId: 'org1',
    userId: 'u1',
    action: 'update',
    entity: 'contact',
    entityId: 'c1',
    changes: '{"name":{"old":"a","new":"b"}}',
    createdAt: new Date('2026-04-25T00:00:02Z'),
    prevHash: r1.hash,
    hash: '',
  }
  r2.hash = computeAuditHash(r1.hash, r2)
  const r3: VerifyRow = {
    id: 'r3',
    organizationId: 'org1',
    userId: 'u1',
    action: 'delete',
    entity: 'contact',
    entityId: 'c1',
    changes: '{}',
    createdAt: new Date('2026-04-25T00:00:03Z'),
    prevHash: r2.hash,
    hash: '',
  }
  r3.hash = computeAuditHash(r2.hash, r3)
  return [r1, r2, r3]
}

function makePrisma(rows: VerifyRow[]) {
  return {
    auditLog: {
      findMany: async () => rows,
    },
  }
}

describe('verifyAuditChain', () => {
  it('reports ok when the chain is intact', async () => {
    const rows = buildChain()
    const report = await verifyAuditChain(makePrisma(rows), 'org1')
    expect(report.ok).toBe(true)
    expect(report.broken).toHaveLength(0)
    expect(report.forked).toHaveLength(0)
    expect(report.totalRows).toBe(3)
    expect(report.hashedRows).toBe(3)
    expect(report.lastHash).toBe(rows[2].hash)
  })

  it('flags rows whose content has been modified after-the-fact', async () => {
    const rows = buildChain()
    rows[1].changes = '{"name":{"old":"a","new":"TAMPERED"}}'
    const report = await verifyAuditChain(makePrisma(rows), 'org1')
    expect(report.ok).toBe(false)
    expect(report.broken).toEqual([{ id: 'r2', reason: 'hash-mismatch' }])
  })

  it('flags orphan-prev when a predecessor is missing', async () => {
    const rows = buildChain()
    // Drop the middle row → r3.prevHash now points to a hash not in the table.
    const dropped = [rows[0], rows[2]]
    const report = await verifyAuditChain(makePrisma(dropped), 'org1')
    // r3 is still self-consistent, so not "broken" — but its prevHash is orphaned.
    expect(report.broken).toHaveLength(0)
    expect(report.forked).toEqual([{ id: 'r3', reason: 'orphan-prev' }])
  })

  it('counts unhashed legacy rows separately from broken rows', async () => {
    const rows = buildChain()
    const legacy: VerifyRow = {
      ...rows[0],
      id: 'legacy1',
      createdAt: new Date('2026-04-24T00:00:00Z'),
      prevHash: null,
      hash: null,
    }
    const report = await verifyAuditChain(makePrisma([legacy, ...rows]), 'org1')
    expect(report.ok).toBe(true)
    expect(report.unhashedRows).toBe(1)
    expect(report.hashedRows).toBe(3)
  })
})
