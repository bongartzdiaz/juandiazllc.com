"use server";

import { createClient } from "@/lib/supabase/server";
// Verhuisd naar lib/notify.ts op 2026-08-02, zodat de cal.com-webhook dezelfde
// meldingen kan gebruiken. Niet geëxporteerd vanuit dit bestand: alles wat een
// "use server"-module exporteert wordt een publiek aanroepbare server-action.
import { notifyEmail, notifyTelegram } from "@/lib/notify";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";

export type ContactState = { status: "idle" | "ok" | "err"; message?: string };

// De taal komt uit een verborgen veld en is dus door de client te kiezen. Hij
// bepaalt alleen in welke taal de automatische ontvangstbevestiging wordt
// opgesteld, maar hij landt wel in de database, dus hij gaat door een
// whitelist en niet door capField: alles buiten deze vier wordt Engels.
const LOCALES = ["en", "nl", "de", "es"] as const;

function readLocale(value: FormDataEntryValue | null): (typeof LOCALES)[number] {
  const raw = String(value ?? "").trim().slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(raw)
    ? (raw as (typeof LOCALES)[number])
    : "en";
}

// Contact submission pipeline.
// - Primary: insert into Supabase `leads` so nothing is ever lost.
// - Secondary: best-effort email to juan@ via Resend (only if
//   RESEND_API_KEY is set — otherwise silently skipped). We don't
//   fail the user if the email hop breaks, since the lead row is
//   already persisted.
// - Acknowledgement to the enquirer: NOT sent from here. A trigger on
//   marketing.leads calls the edge function `lead-acknowledge`, which mails
//   in metadata.locale's language and records when it happened. Keeping it in
//   the database means a Vercel deploy or a cold start cannot swallow it —
//   same reason lead-notify lives there. Source: supabase/functions/.
// - Spam: honeypot field ("website") + min-length message. The
//   honeypot is a hidden input that real users never touch; bots
//   fill every field they can find. If it's non-empty, we fake-ok
//   so the bot doesn't retry, and skip all side effects.

export async function submitLead(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: real users never fill this (hidden via CSS). Bots do.
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    // Pretend success so bots don't retry; skip all real side effects.
    return { status: "ok", message: "Got it. I'll come back to you within 24 hours." };
  }

  // Elk vrij-tekstveld begrensd (zie lib/forms/limits.ts): de tabel heeft geen
  // kolomlimiet en anon mag INSERT'en, dus zonder cap kan een bot de tabel
  // laten opzwellen tot het opslagquotum weer knalt.
  const name = capField(formData.get("name"), "name");
  const email = capField(formData.get("email"), "email").toLowerCase();
  const company = capField(formData.get("company"), "company");
  const sector = capField(formData.get("sector"), "sector");
  const message = capField(formData.get("message"), "message");
  const source = capField(formData.get("source"), "source") || "contact_page";
  const locale = readLocale(formData.get("locale"));

  if (!isPlausibleEmail(email)) {
    return { status: "err", message: "Enter a valid email." };
  }
  if (!message || message.length < 10) {
    return { status: "err", message: "Tell me a bit more — at least a sentence." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .insert({ name, email, company, sector, message, source, metadata: { locale } });

    if (error) {
      return { status: "err", message: "Something went wrong. Try again." };
    }

    // Fire-and-forget notifications — email + Telegram in parallel.
    // Both no-op when unconfigured and never fail the user.
    await Promise.all([
      notifyEmail({ name, email, company, sector, message, source }),
      notifyTelegram({ name, email, company, sector, message, source }),
    ]);

    return {
      status: "ok",
      message: "Got it. I'll come back to you within 24 hours.",
    };
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }
}
