/* ---------------------------------------------------------------
   Next.js instrumentation — runs once on server start.
   Used to initialise Sentry (no-ops without SENTRY_DSN).
   https://nextjs.org/docs/app/guides/instrumentation
   --------------------------------------------------------------- */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initSentry } = await import('./lib/sentry')
    initSentry()
  }
}
