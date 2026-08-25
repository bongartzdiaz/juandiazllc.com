"use server";

import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";
import { translate } from "@/lib/i18n/dict";
import { readLocale } from "@/lib/i18n/form-locale";

export type ContactState = { status: "idle" | "ok" | "err"; message?: string };

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
  // De taal wordt hier gelezen en niet verderop bij de andere velden: de
  // honeypot-tak hieronder keert al terug met een bericht, en dat hoort in de
  // taal van de bezoeker te staan. Stond `locale` lager, dan was die ene tak
  // Engels gebleven -- precies zo'n uitzondering die een poort later moet
  // uitzonderen in plaats van bewaken.
  const locale = readLocale(formData.get("locale"));

  // Honeypot: real users never fill this (hidden via CSS). Bots do.
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    // Pretend success so bots don't retry; skip all real side effects.
    return { status: "ok", message: translate(locale, "form.ok.lead") };
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

  if (!isPlausibleEmail(email)) {
    return { status: "err", message: translate(locale, "form.err.email") };
  }
  if (!message || message.length < 10) {
    return { status: "err", message: translate(locale, "form.err.message") };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .insert({ name, email, company, sector, message, source, metadata: { locale } });

    if (error) {
      return { status: "err", message: translate(locale, "form.err.generic") };
    }

    // Geen meldingen hier: de triggers op marketing.leads doen dat. Zie de kop.

    return { status: "ok", message: translate(locale, "form.ok.lead") };
  } catch {
    // Deze tak heette tot 2026-08-25 `form.err.network`, en die naam beschreef
    // een geval dat hij niet vangt. Gemeten op twee productiebuilds, met
    // alleen de omgeving gewijzigd:
    //
    //   NEXT_PUBLIC_SUPABASE_URL = onbereikbare host  ->  form.err.generic
    //   NEXT_PUBLIC_SUPABASE_URL = leeg               ->  deze tak
    //
    // supabase-js vangt een fetch-fout zelf op en geeft hem terug als
    // `{ error }`. Een netwerkstoring landt dus in de tak hierboven en komt
    // hier nooit. Wat hier wél landt is `createClient()` dat gooit, en dat
    // gebeurt als `getSupabaseUrl()` of `getPublishableKey()` een ontbrekende
    // waarde ziet -- een configuratiefout, geen storing bij de bezoeker.
    //
    // Daarom belooft de kopij hier ook geen nieuwe poging meer: opnieuw
    // verzenden lost een ontbrekende omgevingsvariabele niet op.
    return { status: "err", message: translate(locale, "form.err.unavailable") };
  }
}
