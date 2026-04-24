import { describe, it, expect } from 'vitest'
import { buildGmailQuery, groupByThread } from './gmail-sync'
import type { ParsedGmailMessage } from './gmail-parser'

describe('buildGmailQuery', () => {
  const NOW = new Date('2026-04-20T12:00:00Z')

  it('first-sync window is 30 days', () => {
    expect(buildGmailQuery(null, NOW)).toBe('after:2026/03/21')
  })

  it('uses lastSyncAt minus 1 day overlap', () => {
    const last = new Date('2026-04-19T00:00:00Z')
    expect(buildGmailQuery(last, NOW)).toBe('after:2026/04/18')
  })

  it('handles undefined lastSyncAt as first sync', () => {
    expect(buildGmailQuery(undefined, NOW)).toBe('after:2026/03/21')
  })
})

describe('groupByThread', () => {
  const mk = (threadId: string, id: string): ParsedGmailMessage => ({
    providerMessageId: id,
    providerThreadId: threadId,
    rfcMessageId: `<${id}@mail.gmail.com>`,
    subject: 'Subject',
    from: { email: 'x@y.com', name: null },
    to: [],
    cc: [],
    bcc: [],
    date: new Date(),
    snippet: '',
    labels: [],
    bodyText: null,
    bodyHtml: null,
  })

  it('groups messages by providerThreadId', () => {
    const grouped = groupByThread([mk('t1', 'm1'), mk('t2', 'm2'), mk('t1', 'm3')])
    expect(grouped.size).toBe(2)
    expect(grouped.get('t1')).toHaveLength(2)
    expect(grouped.get('t2')).toHaveLength(1)
  })

  it('returns empty map for empty input', () => {
    expect(groupByThread([]).size).toBe(0)
  })
})
