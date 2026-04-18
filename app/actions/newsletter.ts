"use server";

import { createClient } from "@/lib/supabase/server";

export type NewsletterState = { status: "idle" | "ok" | "err"; message?: string };

// Newsletter signup action.
// Expects a Supabase table `newsletter_subs` with at minimum:
//   email (text, unique), source (text), created_at (timestamptz default now())
// If the table doesn't exist yet, the insert will fail and we'll
// surface a generic error. The SQL to create it lives in
// /supabase/migrations/ (add when ready — until then the action
// degrades gracefully).

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return { status: "ok", message: "Subscribed." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "unknown");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "err", message: "Enter a valid email." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("newsletter_subs")
      .upsert({ email, source }, { onConflict: "email" });

    if (error) {
      // Don't leak the schema error to users; log server-side.
      console.error("[newsletter] insert failed:", error.message);
      return { status: "err", message: "Could not subscribe right now. Try again." };
    }

    return {
      status: "ok",
      message: "Subscribed — I'll only email when there's something worth reading.",
    };
  } catch (e) {
    console.error("[newsletter] exception:", e);
    return { status: "err", message: "Network error. Try again." };
  }
}
