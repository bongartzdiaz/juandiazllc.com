"use server";

/* ⚠️ NOT WIRED TO ANY FORM — see the note below before using this.
 *
 * This is a double opt-in flow: insert into `newsletter_subs` with a
 * confirm_token, email a confirmation link, and only on confirmation does
 * /api/newsletter/confirm mark the row confirmed.
 *
 * It cannot work today, for two independent reasons:
 *
 *   1. `newsletter_subs` does not exist. Not in this project's database, not
 *      in any schema. Every call failed with "relation does not exist", which
 *      is why the /insights signup captured nothing for its entire lifetime.
 *   2. Confirmation needs BREVO_API_KEY, which is not configured. Creating
 *      the table alone would be worse than the current state: signups would
 *      appear to succeed and then sit unconfirmed forever, invisibly.
 *
 * On 2026-07-21 components/NewsletterForm.tsx was pointed at
 * app/actions/subscribe.ts instead, which writes to `subscribers` and works.
 * That is single opt-in — a step down in consent hygiene, taken because a
 * visible working form beats an invisible broken one.
 *
 * To bring this back: create `newsletter_subs` (id, email, source, locale,
 * confirm_token, confirmed_at, created_at) with an insert policy for `anon`,
 * configure BREVO_API_KEY, then repoint NewsletterForm here and verify a
 * confirmation mail actually arrives before trusting it.
 */

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { LOCALES, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/dict";
import { verstuur } from "@/lib/email/brevo";
import { alineaHtml, knopHtml, omhulsel } from "@/lib/email/huisstijl";
import { CONTACT_EMAIL } from "@/lib/seo/branding";

export type NewsletterState = { status: "idle" | "ok" | "err"; message?: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";
const FROM = process.env.NEWSLETTER_FROM ?? "Juan Diaz <noreply@juandiazllc.com>";

type ConfirmCopy = {
  subject: string;
  kop: string;
  alineas: string[];
  knop: string;
  voet: string;
  groet: string[];
};

const COPY: Record<Locale, ConfirmCopy> = {
  en: {
    subject: "One click and the field notes are yours",
    kop: "Field notes",
    alineas: [
      "You signed up for the field notes from juandiazllc.com. One click to confirm and you're in: no follow-ups, no spam, an unsubscribe link at the bottom of every email.",
      "If you didn't sign up, ignore this email and nothing happens.",
    ],
    knop: "Confirm my subscription",
    voet: "Sent because this address was entered on juandiazllc.com. Not you? Ignore this email; without a click nothing is stored beyond the address itself.",
    groet: ["Juan", CONTACT_EMAIL],
  },
  nl: {
    subject: "Eén klik en de field notes zijn van jou",
    kop: "Field notes",
    alineas: [
      "Je hebt je aangemeld voor de field notes van juandiazllc.com. Eén klik om te bevestigen en je zit erin: geen follow-ups, geen spam, onderaan elke mail een afmeldlink.",
      "Heb je je niet aangemeld? Negeer deze mail, er gebeurt niets.",
    ],
    knop: "Bevestig mijn inschrijving",
    voet: "Verstuurd omdat dit adres is ingevuld op juandiazllc.com. Was jij dat niet? Negeer deze mail; zonder klik wordt er niets bewaard behalve het adres zelf.",
    groet: ["Juan", CONTACT_EMAIL],
  },
  de: {
    subject: "Ein Klick, und die Field Notes gehören Ihnen",
    kop: "Field Notes",
    alineas: [
      "Sie haben sich für die Field Notes von juandiazllc.com angemeldet. Ein Klick zur Bestätigung und Sie sind dabei: keine Nachfassaktionen, kein Spam, am Ende jeder E-Mail ein Abmeldelink.",
      "Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach.",
    ],
    knop: "Anmeldung bestätigen",
    voet: "Gesendet, weil diese Adresse auf juandiazllc.com eingetragen wurde. Waren Sie das nicht? Ignorieren Sie diese E-Mail; ohne Klick wird außer der Adresse nichts gespeichert.",
    groet: ["Juan", CONTACT_EMAIL],
  },
  es: {
    subject: "Un clic y las field notes son tuyas",
    kop: "Field notes",
    alineas: [
      "Te has suscrito a las field notes de juandiazllc.com. Un clic para confirmar y listo: sin seguimientos, sin spam, con enlace de baja al pie de cada correo.",
      "Si no te suscribiste, ignora este email y no pasa nada.",
    ],
    knop: "Confirmar mi suscripción",
    voet: "Enviado porque esta dirección se introdujo en juandiazllc.com. ¿No fuiste tú? Ignora este correo; sin clic no se guarda nada más que la dirección.",
    groet: ["Juan", CONTACT_EMAIL],
  },
};

async function sendConfirmEmail(email: string, locale: Locale, token: string) {
  const url = `${SITE_URL}/api/newsletter/confirm?token=${token}`;
  const c = COPY[locale];
  const text = [...c.alineas, "", `${c.knop}: ${url}`, "", ...c.groet, "", c.voet].join("\n");
  const html = omhulsel({
    taal: locale,
    kop: c.kop,
    preheader: c.alineas[0],
    blokken: [...c.alineas.map(alineaHtml), knopHtml({ tekst: c.knop, url })],
    groet: c.groet,
    voet: alineaHtml(c.voet).replace(/^<p[^>]*>/, "").replace(/<\/p>$/, ""),
  });

  // Zonder sleutel: no-op, de rij staat er al en een herzending kan met de
  // hand. De uitkomst wordt gelogd, niet weggeslikt.
  const r = await verstuur(
    { from: FROM, to: email, replyTo: CONTACT_EMAIL, onderwerp: c.subject, text, html },
    { apiKey: process.env.BREVO_API_KEY },
  );
  if (!r.ok) console.warn(`[newsletter] bevestiging niet verstuurd: ${r.reden}`);
}

export async function subscribeToNewsletter(
  _prev: NewsletterState,
  formData: FormData,
): Promise<NewsletterState> {
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return { status: "ok", message: "Check your inbox to confirm." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "unknown");
  const rawLocale = String(formData.get("locale") ?? DEFAULT_LOCALE);
  const locale: Locale = (LOCALES as readonly string[]).includes(rawLocale)
    ? (rawLocale as Locale)
    : DEFAULT_LOCALE;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "err", message: "Enter a valid email." };
  }

  const token = randomUUID();

  try {
    const supabase = await createClient();
    // Insert with the anon key (RLS permits insert only). If the row
    // already exists (primary-key email conflict), the anon policy
    // won't let us update, so we fall through to the service-role
    // path to reset the token for a re-subscribe / re-send.
    const { error: insertErr } = await supabase
      .from("newsletter_subs")
      .insert({ email, source, locale, confirm_token: token });

    if (insertErr && insertErr.code !== "23505" /* unique_violation */) {
      console.error("[newsletter] insert failed:", insertErr.message);
      return { status: "err", message: "Could not subscribe right now. Try again." };
    }

    if (insertErr?.code === "23505") {
      // Duplicate email — re-issue the token (unless already confirmed)
      // via service role so a stale or bounced email can be retried.
      try {
        const admin = createServiceClient();
        const { data: existing } = await admin
          .from("newsletter_subs")
          .select("confirmed_at")
          .eq("email", email)
          .maybeSingle();
        if (existing?.confirmed_at) {
          return {
            status: "ok",
            message: "You're already subscribed — thanks.",
          };
        }
        await admin
          .from("newsletter_subs")
          .update({ confirm_token: token, source, locale })
          .eq("email", email);
      } catch (e) {
        console.error("[newsletter] service update failed:", e);
        // Don't leak details; user-visible flow continues as success.
      }
    }

    await sendConfirmEmail(email, locale, token);

    return {
      status: "ok",
      message: "Check your inbox to confirm — one click and you're in.",
    };
  } catch (e) {
    console.error("[newsletter] exception:", e);
    return { status: "err", message: "Network error. Try again." };
  }
}
