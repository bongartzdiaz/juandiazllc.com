import { translate, type Locale } from "@/lib/i18n/dict";

/* ─────────────────────────────────────────────────────────────
   De zuivere helft van de nieuwsbriefinschrijving.

   Tot 2026-09-19 schreef `app/actions/subscribe.ts` alleen `{ email, source }`
   weg. Daarmee kon `/api/uitschrijven` een nieuwsbriefrij nooit vinden -- die
   route zoekt op `metadata.unsub_token` -- terwijl `nl.sub` in vier talen
   "één klik om af te melden" belooft. De scan-inschrijving
   (`lib/scan-opvang.ts`) had die metadata al; dit bestand is de pendant
   ervoor, met dezelfde veldnamen zodat de afmeldroute en een toekomstige
   campagne-selectie beide vormen op dezelfde manier lezen.

   Wat hier bewust NIET staat is een vinkje. De scan vraagt expliciete
   toestemming omdat het adres ná een uitslag wordt gevraagd die de bezoeker
   al heeft -- het is een tweede handeling. Een nieuwsbriefformulier is zelf
   de handeling: adres invullen en op "Aanmelden" klikken onder een tekst die
   zegt wat je krijgt. Wat we vastleggen is welke tekst dat was, per
   formulier en per taal, zodat "waar heeft deze persoon mee ingestemd" uit
   de rij te lezen is en niet uit een commit die drie versies verder is.

   Geen DDL: alles zit in de bestaande `metadata`-jsonb, net als bij de scan.
   ───────────────────────────────────────────────────────────── */

export const NIEUWSBRIEF_CAMPAGNE = "nieuwsbrief";

/** De `source`-waarde van het formulier op de homepage (CtaBig). Elk ander
    formulier -- NewsletterForm op /insights en waar hij verder gemonteerd
    wordt -- toont `nl.sub`. */
export const HOMEPAGE_BRON = "cta_landing";

/** Welke dict-sleutel de bezoeker als toestemmingstekst zag. Afgeleid uit
    `source` en niet uit een verborgen veld: een client mag niet kiezen wat er
    als toestemming in de rij komt. */
export function toestemmingSleutel(source: string): "cta.news.hint" | "nl.sub" {
  return source === HOMEPAGE_BRON ? "cta.news.hint" : "nl.sub";
}

export type NieuwsbriefMetadata = {
  locale: Locale;
  campagne: typeof NIEUWSBRIEF_CAMPAGNE;
  consent_at: string;
  consent_tekst: string;
  unsub_token: string;
};

export function bouwNieuwsbriefMetadata(input: {
  locale: Locale;
  source: string;
  nu: Date;
  token: string;
}): NieuwsbriefMetadata {
  return {
    locale: input.locale,
    campagne: NIEUWSBRIEF_CAMPAGNE,
    consent_at: input.nu.toISOString(),
    consent_tekst: translate(input.locale, toestemmingSleutel(input.source)),
    unsub_token: input.token,
  };
}
