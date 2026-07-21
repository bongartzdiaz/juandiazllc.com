/* ---------------------------------------------------------------
   Supabase API key resolution.

   Supabase is replacing the legacy JWT keys (`anon` / `service_role`)
   with a new pair (`sb_publishable_…` / `sb_secret_…`). The practical
   difference is revocability: the legacy keys are JWTs signed with the
   project's JWT secret, so revoking one means rotating that secret and
   invalidating every active session. The new keys can be rotated or
   revoked individually without logging anyone out.

   Both are read here, new first, so a deployment can be migrated by
   adding the new env var and removing the old one later — there is no
   moment where the app is broken.

   IMPORTANT — do not refactor these into dynamic lookups.
   `NEXT_PUBLIC_*` values are inlined by Next at build time, and only
   for *literal* `process.env.NEXT_PUBLIC_X` expressions. Rewriting
   this as `process.env[name]` compiles fine and then returns
   undefined in the browser.

   Note the key format has no bearing on permissions: a publishable key
   and a legacy anon key both act as the `anon` Postgres role. What that
   role may do is decided by grants and RLS policies, not by the key.
   --------------------------------------------------------------- */

/** Browser-safe key. Ships in the client bundle by design. */
export function getPublishableKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!key) {
    throw new Error(
      'Supabase publishable key missing — set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (preferred) or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy).',
    )
  }
  return key
}

/** Server-only key. Bypasses RLS — never expose to the browser. */
export function getSecretKey(): string {
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!key) {
    throw new Error(
      'Supabase secret key missing — set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy).',
    )
  }
  return key
}

export function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
  return url
}

/** True when this deployment is still on the legacy JWT keys. */
export function isUsingLegacyKeys(): boolean {
  return (
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  )
}
