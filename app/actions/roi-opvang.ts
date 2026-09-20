"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";
import { translate } from "@/lib/i18n/dict";
import { readLocale } from "@/lib/i18n/form-locale";
import { ROI_BRON, TOESTEMMING_WAARDE, bouwRoiMetadata, leesGetallen } from "@/lib/roi-opvang";

/* Opvang na de ROI-rekenmachine (/tools/energy-roi).
 *
 * Byte voor byte dezelfde vorm als app/actions/scan-opvang.ts: honeypot,
 * verplichte en expliciete toestemming (Telecommunicatiewet 11.7 — dit adres
 * wordt gemaild), rij in marketing.subscribers zonder .select() omdat anon
 * daar alleen INSERT heeft. Wat hier anders is: de metadata draagt de
 * berekening zelf, want die staat nergens anders (zie lib/roi-opvang.ts).
 *
 * Wat hier NIET gebeurt: er gaat vanuit deze action geen mail uit. De ene
 * beloofde mail verstuurt de cron-route app/api/campagne/scan-reeks/route.ts,
 * dagelijks, in de taal uit metadata.locale. */

export type RoiOpvangState = { status: "idle" | "ok" | "err"; message?: string };

export async function vraagBerekeningAan(
  _prev: RoiOpvangState,
  formData: FormData
): Promise<RoiOpvangState> {
  const locale = readLocale(formData.get("locale"));

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    return { status: "ok", message: translate(locale, "form.ok.roi") };
  }

  const email = capField(formData.get("email"), "email").toLowerCase();
  if (!isPlausibleEmail(email)) {
    return { status: "err", message: translate(locale, "form.err.email") };
  }

  if (formData.get("toestemming") !== TOESTEMMING_WAARDE) {
    return { status: "err", message: translate(locale, "form.err.consent") };
  }

  const roi = leesGetallen(formData);

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("subscribers")
      .insert({
        email,
        source: ROI_BRON,
        metadata: bouwRoiMetadata({
          locale,
          consentTekst: translate(locale, "roi.opvang.toestemming"),
          roi,
          nu: new Date(),
          token: randomUUID(),
        }),
      });

    if (error) {
      // UNIQUE(email): het adres staat er al (scan of eerdere berekening).
      // Voor de bezoeker is dat geen fout; de mail van vandaag gaat dan niet
      // opnieuw, en dat zegt de tekst eerlijk.
      if (error.code === "23505") {
        return { status: "ok", message: translate(locale, "form.ok.already") };
      }
      return { status: "err", message: translate(locale, "form.err.generic") };
    }

    return { status: "ok", message: translate(locale, "form.ok.roi") };
  } catch {
    return { status: "err", message: translate(locale, "form.err.unavailable") };
  }
}
