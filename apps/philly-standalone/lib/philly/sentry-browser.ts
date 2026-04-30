/* ---------------------------------------------------------------
   Browser-side Sentry init — Philly + marketing site
   ---------------------------------------------------------------
   Loads @sentry/react lazily so the bundle pays nothing when
   NEXT_PUBLIC_SENTRY_DSN is unset (dev / small installs / preview
   deploys without observability wiring).

   Init runs once per page load. Subsequent calls are no-ops.
   Pairs with the server-side init in lib/philly/sentry.ts;
   PII scrub policy mirrors that file (email-shape strings, sensitive
   keys, auth headers redacted).
   --------------------------------------------------------------- */

let initialized = false

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
      if (SENSITIVE_KEY.test(k)) {
        out[k] = REDACTED
        continue
      }
      out[k] = scrubObject(v, depth + 1)
    }
    return out
  }
  return obj
}

interface BrowserEvent {
  request?: { url?: string; headers?: Record<string, string>; cookies?: unknown }
  user?: { ip_address?: string; [k: string]: unknown }
  extra?: Record<string, unknown>
  message?: string
}

function beforeSend(event: BrowserEvent): BrowserEvent | null {
  const url = event?.request?.url ?? ''
  if (url.includes('/api/health') || url.includes('/api/log-error')) return null

  if (event.request?.headers) {
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(event.request.headers)) {
      out[k] = /authorization|cookie|x-api-key|x-auth-token/i.test(k) ? REDACTED : v
    }
    event.request.headers = out
  }
  if (event.request) delete event.request.cookies
  if (event.user && 'ip_address' in event.user) delete event.user.ip_address
  if (event.extra) event.extra = scrubObject(event.extra) as Record<string, unknown>
  if (event.message) event.message = scrubString(event.message)
  return event
}

/**
 * Initialise the browser Sentry SDK. Safe to call multiple times.
 * No-ops when NEXT_PUBLIC_SENTRY_DSN is unset OR when called
 * outside the browser.
 */
export async function initBrowserSentry(): Promise<void> {
  if (initialized) return
  if (typeof window === 'undefined') return

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  initialized = true

  try {
    const Sentry = await import('@sentry/react')
    Sentry.init({
      dsn,
      environment:
        process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
        process.env.NEXT_PUBLIC_VERCEL_ENV ??
        'development',
      release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
      tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0'),
      replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? '0'),
      replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? '1'),
      sendDefaultPii: false,
      integrations: [
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: true,
          networkDetailDenyUrls: [
            /\/api\/auth\//,
            /\/api\/.*\/token/i,
            /\/login/i,
          ],
        }),
        Sentry.browserTracingIntegration(),
      ],
      // Sentry's ErrorEvent is a structural superset of BrowserEvent;
      // the scrubber mutates and returns the same object.
      beforeSend(event) {
        return beforeSend(event as unknown as BrowserEvent) as never
      },
      beforeBreadcrumb(crumb) {
        if (crumb?.category === 'console') return null
        return crumb
      },
    })
  } catch {
    // Module not resolvable — silently disabled, same as server side.
  }
}

/** Whether browser Sentry has been initialised this page load. */
export function isBrowserSentryEnabled(): boolean {
  return initialized
}
