"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { LOCALES, type Locale, DEFAULT_LOCALE } from "@/lib/i18n/dict";

export type NewsletterState = { status: "idle" | "ok" | "err"; message?: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://juandiazllc.com";
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const FROM = process.env.NEWSLETTER_FROM ?? "noreply@juandiazllc.com";

type ConfirmCopy = { subject: string; body: (url: string) => string };

const COPY: Record<Locale, ConfirmCopy> = {
  en: {
    subject: "Confirm your subscription — Juan Diaz LLC",
    body: (url) =>
      `Thanks for signing up for the field notes from juandiazllc.com.\n\n` +
      `One click to confirm and you're in — no follow-ups, no spam:\n\n${url}\n\n` +
      `If you didn't sign up, ignore this email and nothing happens.`,
  },
  nl: {
    subject: "Bevestig je inschrijving — Juan Diaz LLC",
    body: (url) =>
      `Bedankt voor je aanmelding voor de field notes van juandiazllc.com.\n\n` +
      `Eén klik om te bevestigen en je zit erin — geen follow-ups, geen spam:\n\n${url}\n\n` +
      `Heb je je niet aangemeld? Negeer deze mail, er gebeurt niets.`,
  },
  de: {
    subject: "Anmeldung bestätigen — Juan Diaz LLC",
    body: (url) =>
      `Danke für die Anmeldung zu den Field Notes von juandiazllc.com.\n\n` +
      `Ein Klick zur Bestätigung und Sie sind dabei — keine Nachfassaktionen, kein Spam:\n\n${url}\n\n` +
      `Falls Sie sich nicht angemeldet haben, ignorieren Sie diese E-Mail einfach.`,
  },
  es: {
    subject: "Confirma tu suscripción — Juan Diaz LLC",
    body: (url) =>
      `Gracias por suscribirte a las field notes de juandiazllc.com.\n\n` +
      `Un clic para confirmar y listo — sin seguimientos, sin spam:\n\n${url}\n\n` +
      `Si no te suscribiste, ignora este email y no pasa nada.`,
  },
};

async function sendConfirmEmail(email: string, locale: Locale, token: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // no-op until Resend is configured — the DB row is still there

  const url = `${SITE_URL}/api/newsletter/confirm?token=${token}`;
  const { subject, body } = COPY[locale];

  try {
    await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ from: FROM, to: [email], subject, text: body(url) }),
    });
  } catch {
    // Deliberate swallow — row is persisted, a resend can be triggered manually.
  }
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
