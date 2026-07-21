import { createBrowserClient } from "@supabase/ssr";
import { getPublishableKey, getSupabaseUrl } from "./keys";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getPublishableKey());
}
