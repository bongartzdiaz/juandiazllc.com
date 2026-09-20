"use server";

import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { capField, isPlausibleEmail } from "@/lib/forms/limits";
import { translate } from "@/lib/i18n/dict";
import { readLocale } from "@/lib/i18n/form-locale";
import { scoor } from "@/lib/lekkage-scan";
import {
  SCAN_BRON,
  TOESTEMMING_WAARDE,
  bouwLeadBericht,
  bouwMetadata,
  leesAntwoorden,
} from "@/lib/scan-opvang";
import { TOESTEMMING_TEKSTEN, isScanTaal } from "@/lib/lekkage-scan-taal";

/* De gate van de lekkage-scan (sinds 2026-09-20, avond).
 *
 * De bezoeker heeft zestien vragen beantwoord en laat naam, bedrijf en
 * e-mailadres achter; pas als deze actie `ok` teruggeeft toont het component
 * de uitslag. Gemodelleerd op app/actions/contact.ts (de lead) en het oude
 * scan-opvang (de reeks), in die volgorde:
 *
 * 1. `marketing.leads` — de lead. Bericht = de uitslag, uitgerekend uit de
 *    meegestuurde antwoorden en niet uit een getal van de browser. De
 *    triggers op die tabel doen de melding aan Juan (lead-notify) en de
 *    ontvangstbevestiging aan de bezoeker (lead-acknowledge, 24 uur).
 * 2. `marketing.subscribers` — alleen met het aangevinkte vakje. Dat is de
 *    reeks van drie mails, en die mag alleen met losse, ondubbelzinnige
 *    toestemming (Telecommunicatiewet 11.7). De gate koopt de uitslag, niet
 *    de reeks. Mislukt deze tweede rij, dan is de lead er toch; de uitslag
 *    wordt getoond en `reeks` staat op false.
 *
 * Wat hier NIET gebeurt: er gaat vanuit deze action geen mail uit. De reeks
 * verstuurt app/api/campagne/scan-reeks/route.ts zodra de Vercel-variabelen
 * staan; de bevestiging komt van de databasekant. */

export type ScanOpvangState = {
  status: "idle" | "ok" | "err";
  message?: string;
  /** Alleen bij `ok`: of de rij voor de mailreeks er (ook) staat. */
  reeks?: boolean;
};

export async function vraagUitslagAan(
  _prev: ScanOpvangState,
  formData: FormData
): Promise<ScanOpvangState> {
  const locale = readLocale(formData.get("locale"));

  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    // Doen alsof het lukte, zodat een bot niet opnieuw probeert — en geen
    // uitslag, want die krijgt alleen wie het formulier werkelijk invulde.
    return { status: "ok", reeks: false };
  }

  const name = capField(formData.get("name"), "name");
  const email = capField(formData.get("email"), "email").toLowerCase();
  const company = capField(formData.get("company"), "company");

  if (name.length < 2) {
    return { status: "err", message: translate(locale, "form.err.name") };
  }
  if (!isPlausibleEmail(email)) {
    return { status: "err", message: translate(locale, "form.err.email") };
  }
  if (company.length < 2) {
    return { status: "err", message: translate(locale, "form.err.company") };
  }

  const antwoorden = leesAntwoorden(formData.get("antwoorden"));
  if (!antwoorden) {
    // Alleen bereikbaar buiten het component om: dat stuurt de zestien
    // antwoorden altijd mee en laat de knop pas los als ze er allemaal zijn.
    return { status: "err", message: translate(locale, "form.err.generic") };
  }

  // De uitslag in het Nederlands, voor Juan; de bezoeker rekent hem in zijn
  // eigen taal uit in het component, uit dezelfde antwoorden.
  const lekken = scoor(antwoorden);
  const wilReeks = formData.get("toestemming") === TOESTEMMING_WAARDE;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from("leads").insert({
      name,
      email,
      company,
      sector: "",
      message: bouwLeadBericht(lekken, locale),
      source: SCAN_BRON,
      metadata: {
        locale,
        tool: SCAN_BRON,
        lekken: lekken.length,
        blokken: lekken.map((l) => l.blok),
        antwoorden,
      },
    });
    // Bewust geen .select(): anon heeft op marketing.leads alleen INSERT.

    if (error) {
      return { status: "err", message: translate(locale, "form.err.generic") };
    }

    if (!wilReeks) return { status: "ok", reeks: false };

    const { error: reeksFout } = await supabase.from("subscribers").insert({
      email,
      source: SCAN_BRON,
      metadata: bouwMetadata({
        locale,
        lekken: lekken.length,
        nu: new Date(),
        token: randomUUID(),
        // De tekst die de bezoeker werkelijk zag. Buiten de drie scantalen
        // kan dit formulier niet renderen; valt het toch zo binnen, dan
        // staat er de Nederlandse.
        consentTekst: TOESTEMMING_TEKSTEN[isScanTaal(locale) ? locale : "nl"],
      }),
    });

    // UNIQUE(email): het adres staat er al — dan loopt de reeks al, of heeft
    // gelopen. Voor de bezoeker is dat geen fout. Elke andere fout laat de
    // lead staan en de uitslag zien; alleen de reeks ontbreekt dan.
    const reeks = !reeksFout || reeksFout.code === "23505";
    if (!reeks) console.error("[scan-opvang] subscribers insert failed:", reeksFout.message);
    return { status: "ok", reeks, message: reeks ? translate(locale, "form.ok.scan") : undefined };
  } catch {
    // createClient() gooit alleen op ontbrekende configuratie — zie
    // lib/supabase/foutdoorgifte.test.ts.
    return { status: "err", message: translate(locale, "form.err.unavailable") };
  }
}
