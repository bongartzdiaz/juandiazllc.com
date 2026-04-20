import { describe, it, expect, vi, beforeEach } from 'vitest'

type InsertCall = { table: string; row: Record<string, unknown> }
const calls: InsertCall[] = []
const state = {
  insertError: null as { code?: string; message?: string } | null,
  throwOnInsert: false,
}

function makeFakeChain(table: string) {
  return {
    insert(row: Record<string, unknown>) {
      calls.push({ table, row })
      if (state.throwOnInsert) {
        throw new Error('network')
      }
      return {
        select: () => ({
          single: async () => ({ data: state.insertError ? null : row, error: state.insertError }),
        }),
      }
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => makeFakeChain(table),
  }),
}))

import { subscribe } from './subscribe'

beforeEach(() => {
  calls.length = 0
  state.insertError = null
  state.throwOnInsert = false
})

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

describe('subscribe (server action)', () => {
  it('rejects empty emails', async () => {
    const result = await subscribe({ status: 'idle' }, fd({ email: '' }))
    expect(result.status).toBe('err')
    expect(result.message).toMatch(/valid email/i)
    expect(calls).toHaveLength(0)
  })

  it('rejects malformed emails', async () => {
    const result = await subscribe({ status: 'idle' }, fd({ email: 'not-an-email' }))
    expect(result.status).toBe('err')
    expect(calls).toHaveLength(0)
  })

  it('accepts a valid email, inserts into subscribers, defaults source to landing', async () => {
    const result = await subscribe({ status: 'idle' }, fd({ email: 'Juan@Example.com' }))
    expect(result.status).toBe('ok')
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('subscribers')
    // email is lowercased + trimmed before insert
    expect(calls[0].row.email).toBe('juan@example.com')
    expect(calls[0].row.source).toBe('landing')
  })

  it('preserves an explicit source', async () => {
    await subscribe({ status: 'idle' }, fd({ email: 'a@b.co', source: 'hero' }))
    expect(calls[0].row.source).toBe('hero')
  })

  it('treats a duplicate (23505) as success — friendly idempotent message', async () => {
    state.insertError = { code: '23505', message: 'duplicate key' }
    const result = await subscribe({ status: 'idle' }, fd({ email: 'a@b.co' }))
    expect(result.status).toBe('ok')
    expect(result.message).toMatch(/already on the list/i)
  })

  it('returns err for non-duplicate Supabase errors', async () => {
    state.insertError = { code: '40000', message: 'boom' }
    const result = await subscribe({ status: 'idle' }, fd({ email: 'a@b.co' }))
    expect(result.status).toBe('err')
    expect(result.message).toMatch(/went wrong/i)
  })

  it('returns err on network/exception without crashing', async () => {
    state.throwOnInsert = true
    const result = await subscribe({ status: 'idle' }, fd({ email: 'a@b.co' }))
    expect(result.status).toBe('err')
    expect(result.message).toMatch(/network/i)
  })

  it('trims whitespace around the email', async () => {
    await subscribe({ status: 'idle' }, fd({ email: '   juan@example.com   ' }))
    expect(calls[0].row.email).toBe('juan@example.com')
  })
})
