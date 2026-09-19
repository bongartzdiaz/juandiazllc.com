/* De opvang achter de lekkage-scan: wat er in `marketing.subscribers` komt te
 * staan als een bezoeker na de uitslag zijn adres achterlaat.
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

/** Waarde van `source` in de rij; de campagnes filteren hierop. */
export const SCAN_BRON = "lekkage-scan";

/** Naam van de campagne waar deze inschrijving bij hoort. Wijzigt zodra er een
 *  tweede reeks komt, zodat een adres uit de eerste reeks niet stil in de
 *  tweede belandt. */
export const SCAN_CAMPAGNE = "lekkage-scan-2026-09";

/** Het formulier stuurt het aantal gevonden lekken mee als tekst (dezelfde
 *  waarde als de Plausible-eigenschap `lekken`). Boven dit getal is het geen
 *  scanuitslag meer maar invoer van buiten. */
export const MAX_LEKKEN = 99;

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

/** Leest het `lekken`-veld: alleen een geheel getal van 0 t/m MAX_LEKKEN
 *  telt; alles anders wordt `null`, niet 0 — nul is een echte uitslag. */
export function leesLekken(waarde: unknown): number | null {
  if (typeof waarde !== "string" || !/^\d{1,2}$/.test(waarde)) return null;
  const n = Number(waarde);
  return n <= MAX_LEKKEN ? n : null;
}

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
}): ScanMetadata {
  return {
    locale: invoer.locale,
    campagne: SCAN_CAMPAGNE,
    consent_at: invoer.nu.toISOString(),
    consent_tekst: TOESTEMMING_TEKST,
    lekken: invoer.lekken,
    unsub_token: invoer.token,
  };
}
