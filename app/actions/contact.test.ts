import { describe, it, expect, vi, beforeEach } from 'vitest'

type InsertCall = { table: string; row: Record<string, unknown> }
const supabaseCalls: InsertCall[] = []
const state = {
  insertError: null as { code?: string; message?: string } | null,
  throwOnInsert: false,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        supabaseCalls.push({ table, row })
        if (state.throwOnInsert) throw new Error('net')
        return { error: state.insertError }
      },
    }),
  }),
}))

// Capture fetch calls so we can assert the Resend email path (and
// assert it DIDN'T fire when RESEND_API_KEY is unset).
const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }))
vi.stubGlobal('fetch', fetchSpy)

import { submitLead } from './contact'

beforeEach(() => {
  supabaseCalls.length = 0
  fetchSpy.mockClear()
  state.insertError = null
  state.throwOnInsert = false
  delete process.env.RESEND_API_KEY
})

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

function valid(overrides: Partial<Record<string, string>> = {}): FormData {
  return fd({
    name: 'Marco',
    email: 'marco@example.com',
    company: 'Acme Solar',
    sector: 'energy',
    message: 'Interested in the blueprint call next week.',
    source: 'contact_page',
    ...overrides,
  })
}

describe('submitLead — honeypot', () => {
  it('returns fake-success and skips side effects when honeypot is filled', async () => {
    const result = await submitLead({ status: 'idle' }, valid({ website: 'http://spam.example' }))
    expect(result.status).toBe('ok')
    expect(supabaseCalls).toHaveLength(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('submitLead — validation', () => {
  it('rejects missing email', async () => {
    const result = await submitLead({ status: 'idle' }, valid({ email: '' }))
    expect(result.status).toBe('err')
    expect(result.message).toMatch(/valid email/i)
    expect(supabaseCalls).toHaveLength(0)
  })

  it('rejects malformed email', async () => {
    const result = await submitLead({ status: 'idle' }, valid({ email: 'not-an-email' }))
    expect(result.status).toBe('err')
  })

  it('rejects message shorter than 10 chars', async () => {
    const result = await submitLead({ status: 'idle' }, valid({ message: 'short' }))
    expect(result.status).toBe('err')
    expect(result.message).toMatch(/sentence/i)
  })

  it('rejects missing message', async () => {
    const result = await submitLead({ status: 'idle' }, valid({ message: '' }))
    expect(result.status).toBe('err')
  })
})

describe('submitLead — happy path', () => {
  it('inserts into leads and returns ok', async () => {
    const result = await submitLead({ status: 'idle' }, valid())
    expect(result.status).toBe('ok')
    expect(supabaseCalls).toHaveLength(1)
    expect(supabaseCalls[0].table).toBe('leads')
    expect(supabaseCalls[0].row).toMatchObject({
      name: 'Marco',
      email: 'marco@example.com',
      company: 'Acme Solar',
      sector: 'energy',
      source: 'contact_page',
    })
  })

  it('lowercases and trims the email', async () => {
    await submitLead({ status: 'idle' }, valid({ email: '  Marco@Example.COM  ' }))
    expect(supabaseCalls[0].row.email).toBe('marco@example.com')
  })

  it('skips Resend email when RESEND_API_KEY is unset', async () => {
    await submitLead({ status: 'idle' }, valid())
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends a Resend email when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    await submitLead({ status: 'idle' }, valid())
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test_key')
    const body = JSON.parse(init.body as string)
    expect(body.to).toEqual(['juan@juandiazllc.com'])
    expect(body.reply_to).toBe('marco@example.com')
    expect(body.subject).toMatch(/New contact/)
    expect(body.text).toMatch(/Interested in the blueprint/)
  })

  it('still returns ok even if Resend throws — the lead row is already safe', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    fetchSpy.mockImplementationOnce(async () => { throw new Error('resend down') })
    const result = await submitLead({ status: 'idle' }, valid())
    expect(result.status).toBe('ok')
  })
})

describe('submitLead — supabase error paths', () => {
  it('returns err when the insert fails', async () => {
    state.insertError = { code: '40000', message: 'boom' }
    const result = await submitLead({ status: 'idle' }, valid())
    expect(result.status).toBe('err')
  })

  it('returns err on a thrown exception', async () => {
    state.throwOnInsert = true
    const result = await submitLead({ status: 'idle' }, valid())
    expect(result.status).toBe('err')
    expect(result.message).toMatch(/network/i)
  })
})
