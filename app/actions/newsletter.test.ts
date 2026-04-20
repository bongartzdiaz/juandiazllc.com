import { describe, it, expect, vi, beforeEach } from 'vitest'

type InsertCall = { table: string; row: Record<string, unknown> }
type UpdateCall = { table: string; set: Record<string, unknown>; where: Record<string, unknown> }
const inserts: InsertCall[] = []
const updates: UpdateCall[] = []
const state = {
  insertError: null as { code?: string; message?: string } | null,
  existingConfirmedAt: null as string | null,
  existingRowPresent: false,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        inserts.push({ table, row })
        return Promise.resolve({ error: state.insertError })
      },
    }),
  }),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      const where: Record<string, unknown> = {}
      const chain = {
        select: (_cols: string) => chain,
        update: (set: Record<string, unknown>) => {
          updates.push({ table, set, where })
          return {
            eq: (_k: string, _v: unknown) => Promise.resolve({ error: null }),
          }
        },
        eq: (k: string, v: unknown) => {
          where[k] = v
          return chain
        },
        maybeSingle: async () => ({
          data: state.existingRowPresent ? { confirmed_at: state.existingConfirmedAt } : null,
          error: null,
        }),
      }
      return chain
    },
  }),
}))

const fetchSpy = vi.fn(async () => new Response('{}', { status: 200 }))
vi.stubGlobal('fetch', fetchSpy)

import { subscribeToNewsletter } from './newsletter'

beforeEach(() => {
  inserts.length = 0
  updates.length = 0
  fetchSpy.mockClear()
  state.insertError = null
  state.existingConfirmedAt = null
  state.existingRowPresent = false
  delete process.env.RESEND_API_KEY
})

function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.append(k, v)
  return f
}

describe('subscribeToNewsletter — honeypot + validation', () => {
  it('fake-succeeds when honeypot is filled', async () => {
    const result = await subscribeToNewsletter({ status: 'idle' }, fd({ email: 'a@b.co', website: 'spam' }))
    expect(result.status).toBe('ok')
    expect(inserts).toHaveLength(0)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects invalid email', async () => {
    const result = await subscribeToNewsletter({ status: 'idle' }, fd({ email: 'not-email' }))
    expect(result.status).toBe('err')
    expect(inserts).toHaveLength(0)
  })
})

describe('subscribeToNewsletter — happy path', () => {
  it('inserts a new subscriber with a random token + lowercased email', async () => {
    const result = await subscribeToNewsletter(
      { status: 'idle' },
      fd({ email: '  MARCO@Example.com  ', source: 'footer', locale: 'nl' }),
    )
    expect(result.status).toBe('ok')
    expect(inserts).toHaveLength(1)
    expect(inserts[0].table).toBe('newsletter_subs')
    expect(inserts[0].row.email).toBe('marco@example.com')
    expect(inserts[0].row.source).toBe('footer')
    expect(inserts[0].row.locale).toBe('nl')
    expect(typeof inserts[0].row.confirm_token).toBe('string')
    // UUID v4-ish
    expect(String(inserts[0].row.confirm_token)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('falls back to en when the posted locale is unsupported', async () => {
    await subscribeToNewsletter(
      { status: 'idle' },
      fd({ email: 'a@b.co', locale: 'pt' }),
    )
    expect(inserts[0].row.locale).toBe('en')
  })

  it('skips Resend fetch when RESEND_API_KEY is unset', async () => {
    await subscribeToNewsletter({ status: 'idle' }, fd({ email: 'a@b.co' }))
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('sends a locale-specific confirm email when RESEND_API_KEY is set', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    await subscribeToNewsletter({ status: 'idle' }, fd({ email: 'de@example.com', locale: 'de' }))
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.to).toEqual(['de@example.com'])
    expect(body.subject).toMatch(/Anmeldung bestätigen/)
    expect(body.text).toMatch(/Field Notes/)
    expect(body.text).toMatch(/confirm\?token=[0-9a-f-]{36}/)
  })
})

describe('subscribeToNewsletter — duplicate email flow', () => {
  it('returns "already subscribed" when the email is confirmed already', async () => {
    state.insertError = { code: '23505', message: 'dup' }
    state.existingRowPresent = true
    state.existingConfirmedAt = '2026-01-01T00:00:00Z'

    const result = await subscribeToNewsletter({ status: 'idle' }, fd({ email: 'a@b.co' }))
    expect(result.status).toBe('ok')
    expect(result.message).toMatch(/already subscribed/i)
    // No update — we left the row alone.
    expect(updates).toHaveLength(0)
    // No re-send either.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('re-issues the token when the existing row is not yet confirmed', async () => {
    process.env.RESEND_API_KEY = 'test_key'
    state.insertError = { code: '23505', message: 'dup' }
    state.existingRowPresent = true
    state.existingConfirmedAt = null

    const result = await subscribeToNewsletter(
      { status: 'idle' },
      fd({ email: 'a@b.co', locale: 'es', source: 'landing' }),
    )
    expect(result.status).toBe('ok')
    expect(updates).toHaveLength(1)
    expect(updates[0].table).toBe('newsletter_subs')
    expect(updates[0].set).toMatchObject({ source: 'landing', locale: 'es' })
    expect(typeof updates[0].set.confirm_token).toBe('string')
    // And the confirmation email is resent.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('subscribeToNewsletter — error paths', () => {
  it('returns err for insert errors that are NOT a duplicate-key conflict', async () => {
    state.insertError = { code: '40000', message: 'boom' }
    const result = await subscribeToNewsletter({ status: 'idle' }, fd({ email: 'a@b.co' }))
    expect(result.status).toBe('err')
  })
})
