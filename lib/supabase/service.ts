import { createClient } from "@supabase/supabase-js";
import { getSecretKey, getSupabaseUrl } from "./keys";

// Server-only Supabase client using the service-role key.
// Bypasses RLS — use only for trusted flows (newsletter confirm,
// admin read of leads, etc.). Never import this into a client
// component or a route that accepts arbitrary query input from
// unauthenticated users without explicit validation.

export function createServiceClient() {
  const url = getSupabaseUrl();
  const key = getSecretKey();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
