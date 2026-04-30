/* ---------------------------------------------------------------
   Next.js instrumentation — runs once per runtime on server start.
   Initialises Sentry (no-ops without SENTRY_DSN).
   https://nextjs.org/docs/app/guides/instrumentation
   --------------------------------------------------------------- */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./lib/philly/sentry')
    initSentry()
  }
  // Edge runtime can't load @sentry/node — onRequestError below ships
  // edge errors via fetch transport so nothing hits the floor silently.
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: {
    routerKind: 'Pages Router' | 'App Router'
    routePath: string
    routeType: string
    renderSource?: string
    revalidateReason?: string
  },
) {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { captureException } = await import('./lib/philly/sentry')
      captureException(err, {
        runtime: 'nodejs',
        path: request.path,
        method: request.method,
        routePath: context.routePath,
        routeType: context.routeType,
      })
      return
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      const msg =
        err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
      const host = request.headers['x-forwarded-host']
      const base = host ? `https://${host}` : 'http://localhost:3000'
      await fetch(new URL('/api/log-error', base).toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          runtime: 'edge',
          path: request.path,
          method: request.method,
          routePath: context.routePath,
          message: msg.slice(0, 4000),
        }),
        keepalive: true,
      }).catch(() => {
        /* best-effort */
      })
    }
  } catch {
    /* never let the error hook itself crash */
  }
}
