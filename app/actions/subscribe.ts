"use server";

import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";

export type SubscribeState = { status: "idle" | "ok" | "err"; message?: string };

export async function subscribe(
  _prev: SubscribeState,
  formData: FormData
): Promise<SubscribeState> {
  // Begrensd — zie lib/forms/limits.ts. subscribers.email + .source zijn
  // ongelimiteerde text-kolommen met een anon-INSERT-policy.
  const email = capField(formData.get("email"), "email").toLowerCase();
  const source = capField(formData.get("source"), "source") || "landing";

  if (!isPlausibleEmail(email)) {
    return { status: "err", message: "Enter a valid email." };
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
        return { status: "ok", message: "You're already on the list. ✓" };
      }
      return { status: "err", message: "Something went wrong. Try again." };
    }

    return { status: "ok", message: "Subscribed. Welcome aboard. ✓" };
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }
}
