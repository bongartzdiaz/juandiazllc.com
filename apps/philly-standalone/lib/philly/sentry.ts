/* ---------------------------------------------------------------
   Sentry wrapper — Philly Dashboard
   ---------------------------------------------------------------
   Server-side error reporting via @sentry/node. No-ops cleanly
   when SENTRY_DSN is not set so dev and small deploys don't pay
   for it.

   We load @sentry/node lazily so `next build` on a box without the
   dep installed won't choke — it's only wired when the env var is
   present and the package is resolvable.
   --------------------------------------------------------------- */

type SentryLike = {
  init: (opts: Record<string, unknown>) => void
  captureException: (err: unknown, context?: Record<string, unknown>) => string
  captureMessage: (msg: string, level?: string) => string
  setUser: (user: { id?: string; email?: string; organizationId?: string } | null) => void
  addBreadcrumb: (crumb: Record<string, unknown>) => void
  flush: (timeout?: number) => Promise<boolean>
}

let sentry: SentryLike | null = null
let initialized = false

function tryLoad(): SentryLike | null {
  if (sentry) return sentry
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@sentry/node') as SentryLike
    sentry = mod
    return mod
  } catch {
    return null
  }
}

export function initSentry(): void {
  if (initialized) return
  initialized = true

  const dsn = process.env.SENTRY_DSN
  if (!dsn) return // silently disabled in dev / small installs

  const mod = tryLoad()
  if (!mod) {
    console.warn('[sentry] SENTRY_DSN is set but @sentry/node is not installed')
    return
  }

  try {
    mod.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT_SHA,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
      // Default-deny PII in events. Sentry's own `sendDefaultPii: false`
      // already strips IPs and a few standard fields; we layer on a
      // beforeSend that scrubs auth/cookie headers, query-string tokens,
      // and email-shaped strings inside extras. GDPR Art. 32 — security
      // of processing — argues for minimization at the SDK boundary.
      sendDefaultPii: false,
      beforeSend,
      beforeBreadcrumb(crumb: { category?: string; data?: Record<string, unknown> }) {
        if (crumb?.category === 'console') return null
        if (crumb?.data) crumb.data = scrubObject(crumb.data) as Record<string, unknown>
        return crumb
      },
    })
  } catch (err) {
    console.warn('[sentry] init failed:', err)
  }
}

const SENSITIVE_HEADER = /^(authorization|cookie|set-cookie|x-api-key|x-auth-token|x-csrf-token)$/i
const SENSITIVE_KEY = /(password|secret|token|api[_-]?key|access[_-]?token|refresh[_-]?token|session|cookie|authorization)/i
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const REDACTED = '[redacted]'

function scrubString(s: string): string {
  return s.replace(EMAIL_RE, REDACTED)
}

function scrubObject(obj: unknown, depth = 0): unknown {
  if (depth > 6 || obj == null) return obj
  if (typeof obj === 'string') return scrubString(obj)
  if (Array.isArray(obj)) return obj.map(v => scrubObject(v, depth + 1))
  if (typeof obj === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEY.test(k)) { out[k] = REDACTED; continue }
      out[k] = scrubObject(v, depth + 1)
    }
    return out
  }
  return obj
}

function scrubHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!headers) return headers
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    out[k] = SENSITIVE_HEADER.test(k) ? REDACTED : v
  }
  return out
}

interface SentryEvent {
  request?: {
    url?: string
    headers?: Record<string, string>
    cookies?: unknown
    data?: unknown
    query_string?: string
  }
  user?: { ip_address?: string; [k: string]: unknown }
  extra?: Record<string, unknown>
  contexts?: Record<string, unknown>
  message?: string
}

function beforeSend(event: SentryEvent): SentryEvent | null {
  const url = event?.request?.url ?? ''
  if (url.includes('/api/health')) return null

  if (event.request) {
    event.request.headers = scrubHeaders(event.request.headers)
    delete event.request.cookies
    if (event.request.data) event.request.data = scrubObject(event.request.data)
    if (typeof event.request.query_string === 'string') {
      event.request.query_string = event.request.query_string.replace(
        /(token|key|secret|sig|signature|access_token|refresh_token)=[^&]*/gi,
        `$1=${REDACTED}`,
      )
    }
  }
  if (event.user && 'ip_address' in event.user) delete event.user.ip_address
  if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>
  if (event.message) event.message = scrubString(event.message)
  return event
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  const mod = tryLoad()
  if (!mod || !process.env.SENTRY_DSN) return
  try {
    mod.captureException(err, context ? { extra: context } : undefined)
  } catch {
    /* swallow */
  }
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  const mod = tryLoad()
  if (!mod || !process.env.SENTRY_DSN) return
  try {
    mod.captureMessage(msg, level)
  } catch {
    /* swallow */
  }
}

export function setSentryUser(
  user: { id?: string; email?: string; organizationId?: string } | null,
): void {
  const mod = tryLoad()
  if (!mod || !process.env.SENTRY_DSN) return
  try {
    mod.setUser(user)
  } catch {
    /* swallow */
  }
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  const mod = tryLoad()
  if (!mod || !process.env.SENTRY_DSN) return
  try {
    await mod.flush(timeoutMs)
  } catch {
    /* swallow */
  }
}

/** Whether Sentry is actively reporting. */
export function isSentryEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN) && tryLoad() !== null
}
