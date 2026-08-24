"use server";

import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";
import { translate } from "@/lib/i18n/dict";
import { readLocale } from "@/lib/i18n/form-locale";

export type SubscribeState = { status: "idle" | "ok" | "err"; message?: string };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  // Begrensd — zie lib/forms/limits.ts. subscribers.email + .source zijn
  // ongelimiteerde text-kolommen met een anon-INSERT-policy.
  const email = capField(formData.get("email"), "email").toLowerCase();
  const source = capField(formData.get("source"), "source") || "landing";
  const locale = readLocale(formData.get("locale"));

  if (!isPlausibleEmail(email)) {
    return { status: "err", message: translate(locale, "form.err.email") };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("subscribers")
      .insert({ email, source })
      .select()
      .single();

    if (error) {
      // Duplicate → still treat as success for the user
      if (error.code === "23505") {
        return { status: "ok", message: translate(locale, "form.ok.already") };
      }
      return { status: "err", message: translate(locale, "form.err.generic") };
    }

    return { status: "ok", message: translate(locale, "form.ok.subscribed") };
  } catch {
    return { status: "err", message: translate(locale, "form.err.network") };
  }
}
