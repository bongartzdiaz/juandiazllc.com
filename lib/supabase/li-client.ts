import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _liClient: any = null;

/**
 * Supabase service-role client targeting the `li` (LinkedIn outreach) schema.
 * Singleton — safe to call from any API route.
 */
export function liClient() {
  if (_liClient) return _liClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY for li schema");
  // The `schema: "li"` option routes all .from() calls to the li schema.
  // We use `any` for the generic because the generated Database type only
  // covers the public schema — li.* tables aren't in it.
  _liClient = createClient(url, key, { db: { schema: "li" } } as any);
  return _liClient;
}
