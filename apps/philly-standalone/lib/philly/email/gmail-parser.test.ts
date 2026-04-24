import { describe, it, expect } from 'vitest'
import {
  parseAddress,
  parseAddressList,
  header,
  decodeBase64Url,
  extractBodies,
  parseGmailMessage,
  participantsOf,
  directionFor,
  type GmailMessage,
} from './gmail-parser'

describe('parseAddress', () => {
  it('parses plain email', () => {
    expect(parseAddress('marco@example.com')).toEqual({ email: 'marco@example.com', name: null })
  })

  it('parses "Name" <email> form', () => {
    expect(parseAddress('"Marco Rossi" <marco@example.com>')).toEqual({
      email: 'marco@example.com',
      name: 'Marco Rossi',
    })
  })

  it('parses Name <email> without quotes', () => {
    expect(parseAddress('Marco Rossi <marco@example.com>')).toEqual({
      email: 'marco@example.com',
      name: 'Marco Rossi',
    })
  })

  it('lowercases the email address', () => {
    expect(parseAddress('USER@DOMAIN.COM')?.email).toBe('user@domain.com')
  })

  it('returns null for empty or non-email', () => {
    expect(parseAddress('')).toBeNull()
    expect(parseAddress('not an email')).toBeNull()
    expect(parseAddress('  ')).toBeNull()
  })
})

describe('parseAddressList', () => {
  it('splits multi-recipient Tos', () => {
    const list = parseAddressList('marco@example.com, Jane <jane@acme.io>, bob@x.com')
    expect(list).toHaveLength(3)
    expect(list[0].email).toBe('marco@example.com')
    expect(list[1]).toEqual({ email: 'jane@acme.io', name: 'Jane' })
    expect(list[2].email).toBe('bob@x.com')
  })

  it('handles commas inside quoted names', () => {
    const list = parseAddressList('"Rossi, Marco" <marco@example.com>, jane@acme.io')
    expect(list).toHaveLength(2)
    expect(list[0]).toEqual({ email: 'marco@example.com', name: 'Rossi, Marco' })
    expect(list[1].email).toBe('jane@acme.io')
  })

  it('returns empty array on empty input', () => {
    expect(parseAddressList('')).toEqual([])
  })
})

describe('header lookup', () => {
  it('is case-insensitive', () => {
    const h = [
      { name: 'Subject', value: 'Hello' },
      { name: 'From', value: 'x@y.com' },
    ]
    expect(header(h, 'subject')).toBe('Hello')
    expect(header(h, 'SUBJECT')).toBe('Hello')
    expect(header(h, 'From')).toBe('x@y.com')
  })

  it('returns empty string when header missing', () => {
    expect(header([], 'subject')).toBe('')
    expect(header(undefined, 'subject')).toBe('')
  })
})

describe('decodeBase64Url', () => {
  it('decodes base64url to utf-8', () => {
    // "Hello, world" in base64url (url-safe, no padding)
    const encoded = Buffer.from('Hello, world', 'utf8').toString('base64url')
    expect(decodeBase64Url(encoded)).toBe('Hello, world')
  })

  it('returns empty string for null/undefined/empty', () => {
    expect(decodeBase64Url(null)).toBe('')
    expect(decodeBase64Url(undefined)).toBe('')
    expect(decodeBase64Url('')).toBe('')
  })
})

describe('extractBodies', () => {
  it('pulls text and html from a multipart payload', () => {
    const part = {
      mimeType: 'multipart/alternative',
      parts: [
        {
          mimeType: 'text/plain',
          body: { data: Buffer.from('plain body', 'utf8').toString('base64url') },
        },
        {
          mimeType: 'text/html',
          body: { data: Buffer.from('<p>html body</p>', 'utf8').toString('base64url') },
        },
      ],
    }
    const { text, html } = extractBodies(part)
    expect(text).toBe('plain body')
    expect(html).toBe('<p>html body</p>')
  })

  it('returns null for both when payload is undefined', () => {
    expect(extractBodies(undefined)).toEqual({ text: null, html: null })
  })

  it('only finds the first text/plain and text/html (skips nested repeats)', () => {
    const part = {
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'text/plain',
          body: { data: Buffer.from('first', 'utf8').toString('base64url') },
        },
        {
          mimeType: 'text/plain',
          body: { data: Buffer.from('second', 'utf8').toString('base64url') },
        },
      ],
    }
    expect(extractBodies(part).text).toBe('first')
  })
})

describe('parseGmailMessage', () => {
  const msg: GmailMessage = {
    id: 'msg-1',
    threadId: 'thread-1',
    labelIds: ['INBOX', 'UNREAD'],
    snippet: 'Short preview...',
    internalDate: '1713600000000',
    payload: {
      mimeType: 'text/plain',
      headers: [
        { name: 'From', value: 'Juan <juan@juandiazllc.com>' },
        { name: 'To', value: 'Marco <marco@example.com>, jane@acme.io' },
        { name: 'Cc', value: 'bob@x.com' },
        { name: 'Subject', value: 'Q3 energy numbers' },
        { name: 'Message-ID', value: '<abc123@mail.gmail.com>' },
        { name: 'Date', value: 'Mon, 20 Apr 2026 12:00:00 +0000' },
      ],
      body: { data: Buffer.from('Hello Marco.', 'utf8').toString('base64url') },
    },
  }

  it('populates all identifier fields', () => {
    const p = parseGmailMessage(msg)
    expect(p.providerMessageId).toBe('msg-1')
    expect(p.providerThreadId).toBe('thread-1')
    expect(p.rfcMessageId).toBe('<abc123@mail.gmail.com>')
  })

  it('parses from, to, cc', () => {
    const p = parseGmailMessage(msg)
    expect(p.from?.email).toBe('juan@juandiazllc.com')
    expect(p.from?.name).toBe('Juan')
    expect(p.to.map((a) => a.email)).toEqual(['marco@example.com', 'jane@acme.io'])
    expect(p.cc.map((a) => a.email)).toEqual(['bob@x.com'])
  })

  it('prefers internalDate over Date header', () => {
    const p = parseGmailMessage(msg)
    expect(p.date?.getTime()).toBe(1713600000000)
  })

  it('falls back to Date header when internalDate missing', () => {
    const p = parseGmailMessage({ ...msg, internalDate: undefined })
    expect(p.date).not.toBeNull()
  })

  it('carries subject, snippet, labels, body', () => {
    const p = parseGmailMessage(msg)
    expect(p.subject).toBe('Q3 energy numbers')
    expect(p.snippet).toBe('Short preview...')
    expect(p.labels).toEqual(['INBOX', 'UNREAD'])
    expect(p.bodyText).toBe('Hello Marco.')
    expect(p.bodyHtml).toBeNull()
  })
})

describe('participantsOf', () => {
  it('dedupes + orders from → to → cc', () => {
    const parsed = parseGmailMessage({
      id: 'x',
      threadId: 'x',
      payload: {
        headers: [
          { name: 'From', value: 'juan@jd.com' },
          { name: 'To', value: 'marco@ex.com, juan@jd.com' }, // self-cc
          { name: 'Cc', value: 'jane@acme.io' },
        ],
      },
    })
    expect(participantsOf(parsed)).toEqual(['juan@jd.com', 'marco@ex.com', 'jane@acme.io'])
  })
})

describe('directionFor', () => {
  it('returns outbound when from matches account email', () => {
    const parsed = parseGmailMessage({
      id: 'x',
      threadId: 'x',
      payload: { headers: [{ name: 'From', value: 'juan@jd.com' }] },
    })
    expect(directionFor(parsed, 'juan@jd.com')).toBe('outbound')
    expect(directionFor(parsed, 'JUAN@JD.COM')).toBe('outbound')
  })

  it('returns inbound when from differs', () => {
    const parsed = parseGmailMessage({
      id: 'x',
      threadId: 'x',
      payload: { headers: [{ name: 'From', value: 'external@x.com' }] },
    })
    expect(directionFor(parsed, 'juan@jd.com')).toBe('inbound')
  })
})
