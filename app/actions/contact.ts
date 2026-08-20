"use server";

import { createClient } from "@/lib/supabase/server";
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
// - Deze functie doet één ding: de rij wegschrijven in marketing.leads.
//   Alles wat daarna moet gebeuren hangt aan triggers op die tabel.
// - Interne melding (Telegram + e-mail aan Juan): edge function `lead-notify`,
//   via trigger `leads_notify_new`.
// - Ontvangstbevestiging aan de aanvrager: edge function `lead-acknowledge`,
//   via trigger `leads_acknowledge_new`, in de taal uit metadata.locale.
//
//   Tot 2026-08-20 stuurde deze functie zélf óók een Telegram en een e-mail,
//   via lib/notify.ts. Dat was een volledig duplicaat van lead-notify: zelfde
//   twee kanalen, zelfde ontvanger, op dezelfde rij. Bij correcte configuratie
//   kreeg Juan dus alles dubbel, en bij incorrecte configuratie hoorde je van
//   de Vercel-helft niets — die sloeg stil over (`if (!key) return`) en faalde
//   stil (lege catch). De databasekant geeft per kanaal een reden terug en legt
//   die vast; daarom is die de enige die overblijft.
//
//   Dat scheelt de bezoeker ook twee externe HTTP-aanroepen: die stonden in het
//   request-pad, met een `await` erop en zonder timeout.
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

    // Geen meldingen hier: de triggers op marketing.leads doen dat. Zie de kop.

    return {
      status: "ok",
      message: "Got it. I'll come back to you within 24 hours.",
    };
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }
}
