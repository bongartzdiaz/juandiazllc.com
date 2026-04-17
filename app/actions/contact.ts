"use server";

import { createClient } from "@/lib/supabase/server";

export type ContactState = { status: "idle" | "ok" | "err"; message?: string };

export async function submitLead(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const source = String(formData.get("source") ?? "contact_page");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "err", message: "Enter a valid email." };
  }
  if (!message || message.length < 10) {
    return { status: "err", message: "Tell me a bit more — at least a sentence." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .insert({ name, email, company, sector, message, source });

    if (error) {
      return { status: "err", message: "Something went wrong. Try again." };
    }

    return {
      status: "ok",
      message: "Got it. I'll come back to you within 24 hours.",
    };
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }
}
