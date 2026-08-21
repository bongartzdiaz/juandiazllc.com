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
    })
  } catch (err) {
    console.warn('[sentry] init failed:', err)
  }
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
