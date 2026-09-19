"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";
import { translate } from "@/lib/i18n/dict";
import { readLocale } from "@/lib/i18n/form-locale";
import { SCAN_BRON, TOESTEMMING_WAARDE, bouwMetadata, leesLekken } from "@/lib/scan-opvang";

/* Opvang na de lekkage-scan.
 *
 * Gemodelleerd op app/actions/subscribe.ts, met drie verschillen:
 * - een honeypot-controle zoals in contact.ts (subscribe.ts heeft die niet);
 * - toestemming is verplicht en expliciet. Zonder aangevinkt vakje komt er
 *   geen rij — dit adres wordt gebruikt om te mailen, en dat mag alleen met
 *   ondubbelzinnige toestemming (Telecommunicatiewet 11.7);
 * - de rij draagt metadata: taal, campagne, tijdstip en tekst van de
 *   toestemming, het aantal lekken en een uitschrijftoken. Het token is het
 *   enige dat /api/uitschrijven accepteert.
 *
 * Wat hier NIET gebeurt: er gaat vanuit deze action geen mail uit. De drie
 * beloofde mails verstuurt de cron-route app/api/campagne/scan-reeks/route.ts,
 * dagelijks, zodra CRON_SECRET, RESEND_API_KEY en CAMPAGNE_FROM (plus de
 * Supabase-servicesleutel) in Vercel staan. Tot die tijd is de rij het
 * product, en de belofte in de toestemmingstekst wacht. */

export type ScanOpvangState = { status: "idle" | "ok" | "err"; message?: string };

export async function vraagUitslagAan(
  _prev: ScanOpvangState,
  formData: FormData
): Promise<ScanOpvangState> {
  const locale = readLocale(formData.get("locale"));

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    // Doen alsof het lukte, zodat een bot niet opnieuw probeert.
    return { status: "ok", message: translate(locale, "form.ok.scan") };
  }

  const email = capField(formData.get("email"), "email").toLowerCase();
  if (!isPlausibleEmail(email)) {
    return { status: "err", message: translate(locale, "form.err.email") };
  }

  if (formData.get("toestemming") !== TOESTEMMING_WAARDE) {
    return { status: "err", message: translate(locale, "form.err.consent") };
  }

  const lekken = leesLekken(formData.get("lekken"));

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("subscribers")
      .insert({
        email,
        source: SCAN_BRON,
        metadata: bouwMetadata({ locale, lekken, nu: new Date(), token: randomUUID() }),
      });
    // Bewust geen .select(): anon heeft op marketing.subscribers alleen INSERT
    // (gemeten 2026-08-21), en RETURNING vergt SELECT. Dezelfde vorm als
    // app/actions/contact.ts, het enige pad dat end-to-end is gelopen.

    if (error) {
      // UNIQUE(email): het adres staat er al. Dat is voor de bezoeker goed
      // nieuws en geen fout.
      if (error.code === "23505") {
        return { status: "ok", message: translate(locale, "form.ok.already") };
      }
      return { status: "err", message: translate(locale, "form.err.generic") };
    }

    return { status: "ok", message: translate(locale, "form.ok.scan") };
  } catch {
    // createClient() gooit alleen op ontbrekende configuratie — zie
    // lib/supabase/foutdoorgifte.test.ts.
    return { status: "err", message: translate(locale, "form.err.unavailable") };
  }
}
