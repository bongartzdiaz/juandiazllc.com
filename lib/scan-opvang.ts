/* De opvang achter de lekkage-scan.
 *
 * Sinds 2026-09-20 (avond) is de scan gegate: na de zestien vragen laat de
 * bezoeker naam, bedrijf en e-mailadres achter, en dán pas staat de uitslag op
 * het scherm. Juans woorden: *so that you can actually get leads*. Dat draait
 * de keuze uit docs/lead-magnet.md §1 om; §10 daar legt vast waarom.
 *
 * Twee rijen, elk met eigen grond:
 * - `marketing.leads` — altijd. Dit is de lead: naam, bedrijf, adres en als
 *   bericht de uitslag zelf, zodat Juan op Telegram ziet wát er lekt. De
 *   triggers op die tabel doen de rest (lead-notify, lead-acknowledge).
 * - `marketing.subscribers` — alleen met het vinkje. Dat is de mailreeks, en
 *   die mag alleen met ondubbelzinnige, losse toestemming (Tw 11.7). De gate
 *   koopt de uitslag, niet de reeks.
 *
 * Dit bestand draagt alleen de zuivere helft — constanten en een functie die
 * de metadata-rij bouwt — zodat de server action ernaast (app/actions/
 * scan-opvang.ts) klein blijft en dit deel zonder Supabase-mock te testen is.
 * Een "use server"-module mag bovendien alleen async functies exporteren, dus
 * de constanten kúnnen daar niet wonen.
 *
 * Waarom metadata en geen kolommen. De tabel heeft `email`, `source`,
 * `metadata jsonb` en `created_at`, met UNIQUE(email). Toestemming, taal,
 * uitschrijftoken en campagne passen in `metadata` zonder DDL — en DDL op het
 * levende project is een operator-handeling, geen codewijziging. */

import { VRAGEN, type Antwoorden, type Lek, type Vraag } from "@/lib/lekkage-scan";

/** Waarde van `source` in beide rijen; de campagnes filteren hierop. */
export const SCAN_BRON = "lekkage-scan";

/** Naam van de campagne waar deze inschrijving bij hoort. Wijzigt zodra er een
 *  tweede reeks komt, zodat een adres uit de eerste reeks niet stil in de
 *  tweede belandt. */
export const SCAN_CAMPAGNE = "lekkage-scan-2026-09";

/** Het formulier stuurt de zestien antwoorden mee als JSON in een hidden
 *  input. De server rekent de uitslag zelf uit (`scoor`), zodat wat Juan op
 *  Telegram ziet uit de antwoorden komt en niet uit een getal dat de browser
 *  opgaf. Alles wat geen volledig, geldig antwoordenobject is wordt `null`. */
export function leesAntwoorden(waarde: unknown, vragen: readonly Vraag[] = VRAGEN): Antwoorden | null {
  if (typeof waarde !== "string" || waarde.length > 2000) return null;
  let ruw: unknown;
  try {
    ruw = JSON.parse(waarde);
  } catch {
    return null;
  }
  if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) return null;
  const obj = ruw as Record<string, unknown>;
  const ids = new Set(vragen.map((v) => v.id));
  for (const [k, v] of Object.entries(obj)) {
    if (!ids.has(k) || typeof v !== "boolean") return null;
  }
  const antwoorden: Record<string, boolean> = {};
  for (const id of ids) {
    const v = obj[id];
    if (typeof v !== "boolean") return null;
    antwoorden[id] = v;
  }
  return antwoorden;
}

/** Het bericht in de lead-rij: de uitslag in één regel per lek, in het
 *  Nederlands, want Juan leest hem. De taal van de bezoeker staat erbij
 *  zodat het antwoord in de goede taal gaat. */
export function bouwLeadBericht(lekken: readonly Lek[], taal: string): string {
  const kop = `Lekkage-scan (${taal})`;
  if (lekken.length === 0) return `${kop}: nul lekken gevonden.`;
  const regels = lekken.map(
    (l, i) => `${i + 1}. ${l.naam} — ${l.aantal}/${l.totaal}: ${l.vragen.map((v) => v.id).join(", ")}`,
  );
  return `${kop}: ${lekken.length} ${lekken.length === 1 ? "lek" : "lekken"}.\n${regels.join("\n")}`;
}

/** De waarde die de toestemmingscheckbox moet dragen. Een checkbox zonder
 *  `value` stuurt "on"; een expliciete waarde maakt de controle leesbaar in de
 *  actie én in de test. */
export const TOESTEMMING_WAARDE = "ja";

export type ScanMetadata = {
  locale: string;
  campagne: string;
  consent_at: string;
  consent_tekst: string;
  lekken: number | null;
  unsub_token: string;
};

/** De tekst die naast het vakje staat. Hij gaat mee de rij in, zodat later
 *  vaststaat waar iemand precies mee heeft ingestemd — de tekst op de pagina
 *  kan wijzigen, de rij niet. */
export const TOESTEMMING_TEKST =
  "Ja, stuur me hooguit drie mails over deze lekken. Onderaan elke mail staat een afmeldlink.";

export function bouwMetadata(invoer: {
  locale: string;
  lekken: number | null;
  nu: Date;
  token: string;
  /** De toestemmingstekst zoals de bezoeker hem zag. Sinds 2026-09-20 in
   *  drie talen (lib/lekkage-scan-taal.ts); zonder opgave de Nederlandse. */
  consentTekst?: string;
}): ScanMetadata {
  return {
    locale: invoer.locale,
    campagne: SCAN_CAMPAGNE,
    consent_at: invoer.nu.toISOString(),
    consent_tekst: invoer.consentTekst ?? TOESTEMMING_TEKST,
    lekken: invoer.lekken,
    unsub_token: invoer.token,
  };
}
