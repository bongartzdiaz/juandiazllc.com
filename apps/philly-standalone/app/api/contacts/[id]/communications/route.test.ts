/* Hermetic tests — GET /api/contacts/[id]/communications. */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireSectionMock: vi.fn(),
  contactFindFirstMock: vi.fn(),
  emailThreadFindManyMock: vi.fn(),
  callLogFindManyMock: vi.fn(),
  conversationFindManyMock: vi.fn(),
}))

vi.mock('@/lib/philly/auth-helpers', async () => {
  const actual = await vi.importActual<typeof import('@/lib/philly/auth-helpers')>(
    '@/lib/philly/auth-helpers',
  )
  return {
    ...actual,
    requireSection: (...a: unknown[]) => mocks.requireSectionMock(...a),
  }
})

vi.mock('@/lib/philly/auth', () => ({
  getAuthPrisma: () => ({
    contact: { findFirst: (...a: unknown[]) => mocks.contactFindFirstMock(...a) },
    emailThread: { findMany: (...a: unknown[]) => mocks.emailThreadFindManyMock(...a) },
    callLog: { findMany: (...a: unknown[]) => mocks.callLogFindManyMock(...a) },
    conversation: { findMany: (...a: unknown[]) => mocks.conversationFindManyMock(...a) },
  }),
}))

import { GET } from './route'

const SCOPE = { userId: 'u1', organizationId: 'org_1', role: 'manager' } as const

function makeReq(): Request {
  return new Request('http://x/api/contacts/c1/communications')
}
async function callGet(contactId: string) {
  return GET(makeReq() as never, { params: Promise.resolve({ id: contactId }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireSectionMock.mockResolvedValue(SCOPE)
  mocks.contactFindFirstMock.mockResolvedValue({ id: 'c1' })
  mocks.emailThreadFindManyMock.mockResolvedValue([])
  mocks.callLogFindManyMock.mockResolvedValue([])
  mocks.conversationFindManyMock.mockResolvedValue([])
})

describe('GET /api/contacts/[id]/communications', () => {
  it('gates on requireSection', async () => {
    const forbidden = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    mocks.requireSectionMock.mockResolvedValueOnce(forbidden)
    const res = await callGet('c1')
    expect(res.status).toBe(403)
  })

  it('returns 404 when contact is not in caller org', async () => {
    mocks.contactFindFirstMock.mockResolvedValueOnce(null)
    const res = await callGet('c_other')
    expect(res.status).toBe(404)
    expect(mocks.emailThreadFindManyMock).not.toHaveBeenCalled()
    expect(mocks.callLogFindManyMock).not.toHaveBeenCalled()
    expect(mocks.conversationFindManyMock).not.toHaveBeenCalled()
  })

  it('queries all three sources in parallel with org-scoping', async () => {
    await callGet('c1')

    const emailWhere = mocks.emailThreadFindManyMock.mock.calls[0][0].where
    expect(emailWhere.contactId).toBe('c1')
    expect(emailWhere.account.organizationId).toBe('org_1')

    const callWhere = mocks.callLogFindManyMock.mock.calls[0][0].where
    expect(callWhere.contactId).toBe('c1')
    expect(callWhere.organizationId).toBe('org_1')

    const convWhere = mocks.conversationFindManyMock.mock.calls[0][0].where
    expect(convWhere.contactId).toBe('c1')
    expect(convWhere.organizationId).toBe('org_1')
  })

  it('merges sources sorted by timestamp desc, capped at 25', async () => {
    mocks.emailThreadFindManyMock.mockResolvedValueOnce([
      { id: 'e1', subject: 'Hello', snippet: 'Hi there', lastMessageAt: new Date('2026-05-25T10:00:00Z'), unreadCount: 0 },
    ])
    mocks.callLogFindManyMock.mockResolvedValueOnce([
      { id: 'cl1', direction: 'outbound', status: 'completed', duration: 180, outcome: 'connected', notes: '', createdAt: new Date('2026-05-27T10:00:00Z') },
    ])
    mocks.conversationFindManyMock.mockResolvedValueOnce([
      { id: 'cv1', channel: 'whatsapp', subject: '', status: 'open', lastMessageAt: new Date('2026-05-26T10:00:00Z'), unreadCount: 2 },
    ])

    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data).toHaveLength(3)
    // Sorted by timestamp desc — call (May 27) → conversation (May 26) → email (May 25)
    expect(json.data[0].type).toBe('call')
    expect(json.data[1].type).toBe('conversation')
    expect(json.data[2].type).toBe('email')
  })

  it('formats a call summary with direction + outcome + duration', async () => {
    mocks.callLogFindManyMock.mockResolvedValueOnce([
      { id: 'cl1', direction: 'outbound', status: 'completed', duration: 180, outcome: 'connected', notes: '', createdAt: new Date() },
    ])
    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data[0].summary).toContain('Outbound call')
    expect(json.data[0].summary).toContain('connected')
    expect(json.data[0].summary).toContain('3m')
    expect(json.data[0].direction).toBe('outbound')
  })

  it('marks email + conversation as unread when unreadCount > 0', async () => {
    mocks.emailThreadFindManyMock.mockResolvedValueOnce([
      { id: 'e1', subject: 'New', snippet: '', lastMessageAt: new Date(), unreadCount: 3 },
    ])
    mocks.conversationFindManyMock.mockResolvedValueOnce([
      { id: 'cv1', channel: 'sms', subject: 'Q', status: 'open', lastMessageAt: new Date(), unreadCount: 1 },
    ])
    const res = await callGet('c1')
    const json = await res.json()
    const email = json.data.find((d: { type: string }) => d.type === 'email')
    const conv = json.data.find((d: { type: string }) => d.type === 'conversation')
    expect(email.unread).toBe(true)
    expect(conv.unread).toBe(true)
    expect(conv.channel).toBe('sms')
  })

  it('falls back to "(no subject)" for empty email subject + snippet', async () => {
    mocks.emailThreadFindManyMock.mockResolvedValueOnce([
      { id: 'e1', subject: '', snippet: '', lastMessageAt: new Date(), unreadCount: 0 },
    ])
    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data[0].summary).toBe('(no subject)')
  })

  it('returns empty array when no comms exist', async () => {
    const res = await callGet('c1')
    const json = await res.json()
    expect(json.data).toEqual([])
  })
})
