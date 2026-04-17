"use server";

import { createClient } from "@/lib/supabase/server";

export type AuthState = { status: "idle" | "ok" | "err"; message?: string };

export async function signInWithMagicLink(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/app");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "err", message: "Enter a valid email." };
  }

  try {
    const supabase = await createClient();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      return { status: "err", message: error.message };
    }

    return {
      status: "ok",
      message: "Check your email — magic link is on the way.",
    };
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
