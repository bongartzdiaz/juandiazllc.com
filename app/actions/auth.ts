"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SLO, withSpan } from "@/lib/philly/observability";

export type AuthState = { status: "idle" | "ok" | "err"; message?: string };

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/philly");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "err", message: "Enter a valid email." };
  }
  if (!password) {
    return { status: "err", message: "Enter the password I provided." };
  }

  let authResult: { ok: boolean; reason?: "credentials" | "network" } = { ok: false };
  try {
    authResult = await withSpan(
      { name: "auth.login", slo: SLO.LOGIN, op: "auth.login" },
      async () => {
        const supabase = await createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { ok: false, reason: "credentials" as const };
        return { ok: true };
      },
    );
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }

  if (!authResult.ok) {
    return {
      status: "err",
      message: "Those credentials don't match. Check with Juan if the issue persists.",
    };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
