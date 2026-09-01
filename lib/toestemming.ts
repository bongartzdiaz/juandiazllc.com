/* Toestemming voor het enige ding op deze site dat iets op het apparaat van
   de bezoeker opslaat: Google Analytics 4.

   WAAROM ALLEEN GA4, EN NIET DE ANDERE TWEE.

   ePrivacy art. 5(3) en Telecomwet 11.7a gaan over het OPSLAAN van of
   TOEGANG KRIJGEN TOT informatie op de apparatuur van de gebruiker -- niet
   over "analytics" als categorie. Dat onderscheid bepaalt hier alles:

     Plausible   cookieloos, EU-gehost, alleen geaggregeerd  -> geen poort
     Vercel      geen IP, verzoek-hash die na 24u vervalt     -> geen poort
     GA4         zet `_ga` en `_ga_<container>`               -> POORT

   Die eerste twee poorten zou dus data kosten zonder juridische winst, en
   het zou de verdedigbare stand die deze site sinds april 2026 heeft
   ondermijnen. GA4 valt niet onder de Nederlandse analytics-uitzondering
   waar `priv.p.analytics` op leunt -- de AP eist voor GA voorafgaande
   toestemming.

   GEEN GEO-SPLITSING. diazatlas laat niet-EU-bezoekers automatisch meedoen
   (`bootNonStrict()` in landing/_compliance.js). Hier niet: alle vier de
   talen bedienen EU-markten (NL/BE, DE, ES), dus een geo-splitsing koopt
   bijna niets en voegt een geo-detectie-afhankelijkheid toe. Iedereen krijgt
   dezelfde vraag.

   OPSLAG IN localStorage, NIET IN EEN COOKIE. Een toestemmingscookie zou
   zelf zijn vrijgesteld (strikt noodzakelijk), maar localStorage houdt de
   belofte in `priv.p.cookies` letterlijk waar: er staat precies een cookie
   tot de bezoeker GA4 accepteert. Het bestaande `analytics-opt-out` doet het
   om dezelfde reden zo.

   DE VERSIE IN DE SLEUTEL IS GEEN VERSIERING. Komt er ooit een tweede doel
   bij -- advertenties, personalisatie -- dan MOET dit nummer omhoog. Anders
   dekt een oude "ja" stilzwijgend een doel dat de bezoeker nooit gezien
   heeft. Dat is precies waarom diazatlas van `_v1` naar `_v2` ging toen daar
   advertenties bij kwamen. */

export const TOESTEMMING_VERSIE = 1;
export const TOESTEMMING_SLEUTEL = `jd-toestemming-v${TOESTEMMING_VERSIE}`;

/* Het event waarmee de banner de GA4-lader wakker maakt. Zonder dit zou een
   bezoeker die net "ja" klikte pas bij de volgende paginalading gemeten
   worden -- en op een site met client-side navigatie is dat vaak nooit. */
export const TOESTEMMING_EVENT = "jd-toestemming-gewijzigd";

export type Keuze = "ja" | "nee";

function isKeuze(waarde: string | null): waarde is Keuze {
  return waarde === "ja" || waarde === "nee";
}

/** `null` betekent: nog niet gevraagd. Dat is niet hetzelfde als "nee" --
 *  bij `null` toont de banner, bij "nee" niet. */
export function leesToestemming(): Keuze | null {
  if (typeof window === "undefined") return null;
  try {
    const waarde = window.localStorage.getItem(TOESTEMMING_SLEUTEL);
    return isKeuze(waarde) ? waarde : null;
  } catch {
    /* Privémodus of geblokkeerde opslag. Terugvallen op `null` betekent dat
       de banner elke keer terugkomt en GA4 nooit laadt. Dat is de goede kant
       om op te falen: niet meten is hersteltbaar, ongevraagd meten niet. */
    return null;
  }
}

export function schrijfToestemming(keuze: Keuze): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOESTEMMING_SLEUTEL, keuze);
  } catch {
    /* Niets te doen. Het event vuurt hieronder alsnog, zodat de keuze deze
       sessie werkt ook als hij niet bewaard kan worden. */
  }
  window.dispatchEvent(new CustomEvent(TOESTEMMING_EVENT, { detail: keuze }));
}

/* Intrekken moet net zo makkelijk zijn als geven -- dat is geen stijlkeuze
   maar de eis uit AVG art. 7 lid 3. De knop op /privacy leest dit. */
export function wisToestemming(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOESTEMMING_SLEUTEL);
  } catch {
    /* idem */
  }
  window.dispatchEvent(new CustomEvent(TOESTEMMING_EVENT, { detail: null }));
}
