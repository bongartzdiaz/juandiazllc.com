import type { Locale } from "./dict";

/* Routes onder app/[locale] die bewust maar in één taal bestaan.
 *
 * Twee plekken hebben dit feit nodig: app/sitemap.ts (emit alleen /nl, met
 * hreflang voor nl alleen) en metadata-locales.test.ts (die eist normaal dat
 * titel en beschrijving per taal verschillen — wat bij een route die in de
 * andere drie talen 404't onmogelijk is).
 *
 * Die twee als losse lijsten opschrijven is de bugklasse die dit logboek het
 * vaakst tegenkomt: een contract verdeeld over twee lijsten die niets synchroon
 * houdt. Vandaar één bron, en een gate in lekkage-scan.test.ts die eist dat de
 * pagina zelf ook werkelijk 404't buiten zijn taal — anders wordt deze lijst
 * een achterdeur om een onvertaalde vierstalige pagina te verstoppen. */
export const ENKELE_TAAL: Record<string, { locales: Locale[]; reden: string }> = {
  "/tools/lekkage-scan": {
    locales: ["nl"],
    reden:
      "Alle vier de bevestigde engagements in docs/claims.md zijn NL/BE en het ICP is dat ook. " +
      "Dezelfde keuze als bij het saldering-cluster: een vertaalde versie voor een markt waar " +
      "geen bewijs uit komt is dunne inhoud, geen bereik.",
  },
};

/** De talen waarin een route bestaat. Onbekend pad = alle vier. */
export function localesVoor(pad: string, alle: readonly Locale[]): Locale[] {
  return ENKELE_TAAL[pad]?.locales ?? [...alle];
}
