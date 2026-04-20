import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key.
// Bypasses RLS — use only for trusted flows (newsletter confirm,
// admin read of leads, etc.). Never import this into a client
// component or a route that accepts arbitrary query input from
// unauthenticated users without explicit validation.

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase service-role client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
