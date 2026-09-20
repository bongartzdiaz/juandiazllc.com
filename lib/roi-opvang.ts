/* De opvang achter de ROI-rekenmachine: wat er in `marketing.subscribers`
 * komt te staan als een bezoeker na het rekenen zijn adres achterlaat om de
 * berekening per mail te krijgen.
 *
 * Gemodelleerd op lib/scan-opvang.ts, met dezelfde naad: dit bestand draagt
 * alleen de zuivere helft — constanten, het lezen van de getallen en de
 * metadata-bouwer — zodat de server action ernaast (app/actions/roi-opvang.ts)
 * klein blijft en dit deel zonder Supabase te testen is.
 *
 * Waarom de getallen mee de rij in gaan. De mail moet de berekening dragen die
 * de bezoeker op het scherm zag, en die staat nergens anders: de rekenmachine
 * is pure browser-wiskunde zonder backend. De waarden komen via hidden inputs
 * binnen en zijn dus invoer van buiten, precies als `lekken` bij de scan. Elk
 * veld heeft een whitelist met grenzen; wat erbuiten valt wordt `null`, niet 0
 * — anders leest een kapotte inzending later als "€0 besparing".
 *
 * Eén mail, geen reeks. De bezoeker vraagt zijn eigen berekening op; dat is
 * een verzoek, geen campagne. Hij krijgt tóch een uitschrijftoken, omdat de
 * rij in dezelfde tabel staat als de scan-reeks en /api/uitschrijven hem moet
 * kunnen vinden. */

/** Waarde van `source` in de rij; de cron filtert hierop. */
export const ROI_BRON = "energy-roi";

/** Campagnenaam in de rij, zodat een tweede versie van de mail nooit stil
 *  adressen uit de eerste meeneemt. */
export const ROI_CAMPAGNE = "energy-roi-2026-09";

/** Zelfde waarde als bij de scan: een checkbox zonder `value` stuurt "on". */
export const TOESTEMMING_WAARDE = "ja";

/** De velden die het formulier meestuurt, met de grens waarbinnen een waarde
 *  nog een rekenuitkomst is en geen invoer van buiten. Bedragen in euro,
 *  energie in kWh, vermogen in kWp, prijzen in €/kWh, aandelen als 0..1. */
export const ROI_VELDEN = {
  consumption: { min: 0, max: 1_000_000 },
  systemSize: { min: 0, max: 10_000 },
  systemPrice: { min: 0, max: 10_000_000 },
  consumerPrice: { min: 0, max: 10 },
  feedInPrice: { min: -1, max: 10 },
  yieldPerKwp: { min: 0, max: 3_000 },
  withBattery: { min: 0, max: 1 },
  batterySize: { min: 0, max: 10_000 },
  batteryPrice: { min: 0, max: 10_000_000 },
  scNoBat: { min: 0, max: 1 },
  scWithBat: { min: 0, max: 1 },
  production: { min: 0, max: 100_000_000 },
  savingsSald: { min: -1e9, max: 1e9 },
  savingsNoBat: { min: -1e9, max: 1e9 },
  savingsWithBat: { min: -1e9, max: 1e9 },
  paybackSald: { min: 0, max: 10_000 },
  paybackNoBat: { min: 0, max: 10_000 },
  paybackWithBat: { min: 0, max: 10_000 },
} as const;

export type RoiVeld = keyof typeof ROI_VELDEN;
export type RoiGetallen = Record<RoiVeld, number | null>;

/** Leest één veld: een eindig getal binnen zijn grenzen telt, alles anders
 *  wordt `null`. `Infinity` (terugverdientijd bij nul besparing) is bewust
 *  `null`: de rekenmachine toont daar "—", de mail hoort dat ook te doen. */
export function leesGetal(veld: RoiVeld, waarde: unknown): number | null {
  if (typeof waarde !== "string" || !/^-?\d+(\.\d+)?$/.test(waarde.trim())) return null;
  const n = Number(waarde);
  if (!Number.isFinite(n)) return null;
  const { min, max } = ROI_VELDEN[veld];
  return n >= min && n <= max ? n : null;
}

/** Alle velden in één keer, uit een FormData of een gewoon object. */
export function leesGetallen(bron: { get(naam: string): unknown }): RoiGetallen {
  const uit = {} as RoiGetallen;
  for (const veld of Object.keys(ROI_VELDEN) as RoiVeld[]) {
    uit[veld] = leesGetal(veld, bron.get(veld));
  }
  return uit;
}

export type RoiMetadata = {
  locale: string;
  campagne: string;
  consent_at: string;
  consent_tekst: string;
  roi: RoiGetallen;
  unsub_token: string;
};

/** De toestemmingstekst gaat mee de rij in, zodat later vaststaat waar iemand
 *  precies mee heeft ingestemd — de tekst op de pagina kan wijzigen, de rij
 *  niet. Hij komt per taal uit dict.ts (`roi.opvang.toestemming`); de action
 *  geeft hem hier binnen. */
export function bouwRoiMetadata(invoer: {
  locale: string;
  consentTekst: string;
  roi: RoiGetallen;
  nu: Date;
  token: string;
}): RoiMetadata {
  return {
    locale: invoer.locale,
    campagne: ROI_CAMPAGNE,
    consent_at: invoer.nu.toISOString(),
    consent_tekst: invoer.consentTekst,
    roi: invoer.roi,
    unsub_token: invoer.token,
  };
}
