/* App base URL resolution.

   Several routes need the publicly-reachable base URL to compose
   redirect / webhook / return URLs (Stripe Checkout, Stripe Portal,
   calendar OAuth, calendar webhook subscribe). They all want the
   same thing: NEXT_PUBLIC_APP_URL with a fallback to
   NEXT_PUBLIC_SITE_URL, trailing slash stripped, fail loudly if
   neither is set.

   Hoisted into a single helper so the contract stays consistent
   across routes. Audit Finding 7 caught a drift between the
   checkout and portal routes — checkout failed fast on missing env,
   portal silently composed a relative URL that Stripe later rejected
   with a confusing error. */

export interface AppUrlResult {
  ok: boolean
  url: string
  error?: 'missing_env'
}

/**
 * Returns the trimmed app base URL, or `{ ok: false }` if no
 * suitable env var is set. Caller is responsible for translating
 * `ok: false` into an HTTP response (typically 503 with a clear
 * operator message) — keeping that policy out of this helper so
 * non-route callers can use it too (e.g. push-sync subscribe).
 */
export function getAppBaseUrl(): AppUrlResult {
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL
  if (!raw) return { ok: false, url: '', error: 'missing_env' }
  return { ok: true, url: raw.replace(/\/$/, '') }
}

/** Convenience: resolve or throw. Use only in routes that can't
 *  meaningfully degrade (e.g. test setup); production code paths
 *  should branch on the typed result so they can return a clean 503. */
export function getAppBaseUrlOrThrow(): string {
  const r = getAppBaseUrl()
  if (!r.ok) {
    throw new Error(
      'NEXT_PUBLIC_APP_URL (or NEXT_PUBLIC_SITE_URL) must be set — ' +
        'callers need a public base URL for redirects/webhooks.',
    )
  }
  return r.url
}
