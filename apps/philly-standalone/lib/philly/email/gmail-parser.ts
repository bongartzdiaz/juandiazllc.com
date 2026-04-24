/* ---------------------------------------------------------------
   Pure Gmail API message-parser.

   Keeps everything that's `fetch`-free and DB-free in one place so the
   sync engine stays small and the parsing is testable without mocks.
   --------------------------------------------------------------- */

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailPart {
  mimeType?: string
  filename?: string
  headers?: GmailHeader[]
  body?: { data?: string; size?: number; attachmentId?: string }
  parts?: GmailPart[]
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  internalDate?: string
  payload?: GmailPart
}

export interface ParsedEmailAddress {
  email: string
  name: string | null
}

export interface ParsedGmailMessage {
  providerMessageId: string   // Gmail's message `id`
  providerThreadId: string    // Gmail's `threadId`
  rfcMessageId: string | null // RFC 2822 Message-ID header
  subject: string
  from: ParsedEmailAddress | null
  to: ParsedEmailAddress[]
  cc: ParsedEmailAddress[]
  bcc: ParsedEmailAddress[]
  date: Date | null
  snippet: string
  labels: string[]
  bodyText: string | null
  bodyHtml: string | null
}

/** Pull a header by name (case-insensitive). Returns empty string if absent. */
export function header(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return ''
  const lower = name.toLowerCase()
  for (const h of headers) {
    if (h.name.toLowerCase() === lower) return h.value
  }
  return ''
}

/** Parse `"Name" <email@x.com>` or `email@x.com` into {email, name}. */
export function parseAddress(raw: string): ParsedEmailAddress | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Form: "Name" <email@x.com>  OR  Name <email@x.com>
  const m = trimmed.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  if (m) {
    const name = m[1].trim()
    const email = m[2].trim().toLowerCase()
    if (!email) return null
    return { email, name: name || null }
  }
  // Plain email
  const email = trimmed.toLowerCase()
  if (!email.includes('@')) return null
  return { email, name: null }
}

/** Parse a comma-separated address list. Handles commas inside quoted names. */
export function parseAddressList(raw: string): ParsedEmailAddress[] {
  if (!raw) return []
  const out: ParsedEmailAddress[] = []
  let depth = 0
  let buf = ''
  for (const ch of raw) {
    if (ch === '"') depth = depth ? 0 : 1
    if (ch === ',' && depth === 0) {
      const parsed = parseAddress(buf)
      if (parsed) out.push(parsed)
      buf = ''
    } else {
      buf += ch
    }
  }
  const tail = parseAddress(buf)
  if (tail) out.push(tail)
  return out
}

/** Decode a base64url string (Gmail uses this for part bodies). */
export function decodeBase64Url(s: string | undefined | null): string {
  if (!s) return ''
  try {
    // Gmail returns padded or unpadded base64url. Buffer handles both.
    return Buffer.from(s, 'base64url').toString('utf8')
  } catch {
    return ''
  }
}

/** Walk the MIME tree and extract the first text/plain and text/html bodies. */
export function extractBodies(part: GmailPart | undefined): { text: string | null; html: string | null } {
  if (!part) return { text: null, html: null }
  let text: string | null = null
  let html: string | null = null

  const visit = (p: GmailPart) => {
    const mime = (p.mimeType ?? '').toLowerCase()
    const data = p.body?.data
    if (data) {
      if (mime === 'text/plain' && text === null) text = decodeBase64Url(data)
      else if (mime === 'text/html' && html === null) html = decodeBase64Url(data)
    }
    if (p.parts) for (const c of p.parts) visit(c)
  }

  visit(part)
  return { text, html }
}

/** Full parse: Gmail API response → normalized ParsedGmailMessage. */
export function parseGmailMessage(msg: GmailMessage): ParsedGmailMessage {
  const h = msg.payload?.headers
  const subject = header(h, 'subject')
  const from = parseAddress(header(h, 'from'))
  const to = parseAddressList(header(h, 'to'))
  const cc = parseAddressList(header(h, 'cc'))
  const bcc = parseAddressList(header(h, 'bcc'))
  const rfcMessageId = header(h, 'message-id') || null
  const dateHeader = header(h, 'date')

  let date: Date | null = null
  if (msg.internalDate) {
    const n = Number(msg.internalDate)
    if (Number.isFinite(n) && n > 0) date = new Date(n)
  }
  if (!date && dateHeader) {
    const parsed = new Date(dateHeader)
    if (!Number.isNaN(parsed.getTime())) date = parsed
  }

  const { text, html } = extractBodies(msg.payload)

  return {
    providerMessageId: msg.id,
    providerThreadId: msg.threadId,
    rfcMessageId,
    subject,
    from,
    to,
    cc,
    bcc,
    date,
    snippet: msg.snippet ?? '',
    labels: msg.labelIds ?? [],
    bodyText: text,
    bodyHtml: html,
  }
}

/** Collapse a parsed message into a list of unique addresses for thread
 *  participant tracking. Ordered by appearance; from first, then to/cc/bcc. */
export function participantsOf(p: ParsedGmailMessage): string[] {
  const seen = new Set<string>()
  const push = (a: ParsedEmailAddress | null) => {
    if (!a) return
    if (seen.has(a.email)) return
    seen.add(a.email)
  }
  push(p.from)
  p.to.forEach(push)
  p.cc.forEach(push)
  p.bcc.forEach(push)
  return Array.from(seen)
}

/** Decide direction from account-owner email + parsed message from-address. */
export function directionFor(p: ParsedGmailMessage, accountEmail: string): 'inbound' | 'outbound' {
  if (!p.from) return 'inbound'
  return p.from.email.toLowerCase() === accountEmail.toLowerCase() ? 'outbound' : 'inbound'
}
