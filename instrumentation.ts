/* ---------------------------------------------------------------
   Next.js instrumentation — runs once per runtime on server start.
   Used to initialise Sentry (no-ops without SENTRY_DSN).
   https://nextjs.org/docs/app/guides/instrumentation
   --------------------------------------------------------------- */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./lib/sentry')
    initSentry()
  }
  // Edge runtime (proxy.ts + edge routes) can't load @sentry/node — it
  // relies on Node APIs. We'd need @sentry/nextjs for full edge coverage.
  // Until then, onRequestError below catches edge errors via fetch
  // transport, so nothing hits the floor silently.
}

// Next 16 error hook — fires on unhandled render / route errors in
// every runtime. We dispatch to Sentry on Node, and for edge we ship
// a compact payload to /api/log-error so the event reaches the
// existing sink. Shape is stable across runtimes.
export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: 'Pages Router' | 'App Router'; routePath: string; routeType: string; renderSource?: string; revalidateReason?: string },
) {
  try {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { captureException } = await import('./lib/sentry')
      captureException(err, {
        runtime: 'nodejs',
        path: request.path,
        method: request.method,
        routePath: context.routePath,
        routeType: context.routeType,
      })
      return
    }
    // Edge / other — no Node Sentry client. POST to the existing sink.
    if (process.env.NEXT_RUNTIME === 'edge') {
      const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
      await fetch(new URL('/api/log-error', request.headers['x-forwarded-host'] ? `https://${request.headers['x-forwarded-host']}` : 'http://localhost:3000').toString(), {
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
      }).catch(() => { /* best-effort */ })
    }
  } catch {
    /* never let the error hook itself crash */
  }
}
