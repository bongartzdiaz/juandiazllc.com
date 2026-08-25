/* ---------------------------------------------------------------
   Sentry wrapper — server-side error reporting via @sentry/node.
   ---------------------------------------------------------------
   Wired from instrumentation.ts on the Node runtime only. Every
   unhandled render/route error reaches captureException through
   onRequestError, so this module is the whole reporting path.

   No-ops cleanly when SENTRY_DSN is unset, so dev and small deploys
   don't pay for it. @sentry/node is loaded lazily so `next build` on
   a box without the dep installed won't choke.

   THE GUARD IS `active`, NEVER `process.env.SENTRY_DSN`.
   Until 2026-08-25 every function here asked "is the variable set?"
   instead of "did init actually succeed?". Production had SENTRY_DSN
   set to the literal text `optional`; init threw, the throw was
   caught and warned, and then each capture call passed the truthy
   env check, called into an UNINITIALISED client, and was swallowed
   by its own empty catch. isSentryEnabled() reported true the whole
   time. Every server error went to the floor and nothing said so.

   A DSN that is set but unusable must therefore behave exactly like
   an unset one — off, and loudly — not like a working one.
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
let active = false

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

/**
 * Shape check on a Sentry DSN: {http,https}://<publicKey>@<host>[/<path>]/<projectId>
 *
 * Deliberately structural, not a regex on the whole string — a
 * self-hosted Sentry may sit behind a path prefix, and the legacy
 * form carries a secret after the public key. Both must keep
 * working; the only thing that must fail is a value that could
 * never address a Sentry ingest endpoint.
 */
export function dsnLooksUsable(dsn: string): boolean {
  let u: URL
  try {
    u = new URL(dsn)
  } catch {
    return false
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
  if (!u.username) return false // public key
  if (!u.hostname) return false
  const projectId = u.pathname.split('/').filter(Boolean).pop()
  return Boolean(projectId)
}

/**
 * @param injected test seam — pass a fake client to exercise the state
 *   machine without requiring @sentry/node. Production passes nothing.
 */
export function initSentry(injected?: SentryLike): void {
  if (initialized) return
  initialized = true

  const raw = process.env.SENTRY_DSN
  if (!raw || !raw.trim()) return // silently disabled in dev / small installs

  const dsn = raw.trim()
  if (!dsnLooksUsable(dsn)) {
    // Loud: this is the state that looks configured and reports nothing.
    // The DSN itself is not echoed — only why it was rejected.
    console.error(
      '[sentry] SENTRY_DSN is set but is not a usable DSN, so error reporting stays OFF. ' +
        'Expected https://<publicKey>@<host>/<projectId>. Clear the variable or set a real DSN.',
    )
    return
  }

  const mod = injected ?? tryLoad()
  if (!mod) {
    console.error('[sentry] SENTRY_DSN is set but @sentry/node is not installed — reporting stays OFF')
    return
  }
  sentry = mod

  try {
    mod.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
      release: process.env.SENTRY_RELEASE ?? process.env.GIT_COMMIT_SHA,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
    })
    active = true
  } catch (err) {
    console.error('[sentry] init failed, reporting stays OFF:', err)
  }
}

/** The client, but only once init has actually succeeded. */
function live(): SentryLike | null {
  return active ? sentry : null
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  const mod = live()
  if (!mod) return
  try {
    mod.captureException(err, context ? { extra: context } : undefined)
  } catch {
    /* swallow */
  }
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  const mod = live()
  if (!mod) return
  try {
    mod.captureMessage(msg, level)
  } catch {
    /* swallow */
  }
}

export function setSentryUser(
  user: { id?: string; email?: string; organizationId?: string } | null,
): void {
  const mod = live()
  if (!mod) return
  try {
    mod.setUser(user)
  } catch {
    /* swallow */
  }
}

export async function flushSentry(timeoutMs = 2000): Promise<void> {
  const mod = live()
  if (!mod) return
  try {
    await mod.flush(timeoutMs)
  } catch {
    /* swallow */
  }
}

/** Whether Sentry is actively reporting. True only after a successful init. */
export function isSentryEnabled(): boolean {
  return active
}
