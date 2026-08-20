import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  PERSON_NAME,
  PERSON_ALTERNATE_NAMES,
  PERSON_ID,
  PERSON_URL,
  PERSON_SAME_AS,
  ORG_ID,
  ORG_NAME,
  ORG_SAME_AS,
} from "./branding";

/* Poort: de site beschrijft één persoon, niet vier.
 *
 * Op 2026-08-20 stonden er vier `Person`-knopen in de JSON-LD en waren ze het
 * oneens. Gemeten, niet vermoed:
 *
 *   app/layout.tsx (founder)          "Juan Stefan Bongartz Diaz"  geen url
 *   app/[locale]/layout.tsx (founder) "Juan Stefan Diaz"           /{l}/about
 *   app/[locale]/about/page.tsx       "Juan Stefan Bongartz Diaz"  /about → 307
 *   lib/seo/article.ts                "Juan Stefan Bongartz Diaz"  /about → 307
 *
 * Geen enkele droeg een `@id`. Zonder dat mag een crawler ze als vier losse
 * personen lezen, en dan verdeelt elk signaal zich over vier knopen in plaats
 * van zich op één te stapelen. Dat is precies het tegenovergestelde van wat je
 * wilt op een naam die al verzadigd is met naamgenoten.
 *
 * DE TWEEDE TEST IS DE KERN. Een nieuwe `Person`-knoop zonder `PERSON_ID` is
 * hoe dit gat is ontstaan en hoe het terugkomt. Hij telt per bestand de
 * `Person`-knopen en eist er evenveel verwijzingen naar `PERSON_ID`.
 *
 * WAT DEZE POORT NIET ZIET: of de profielen in `sameAs` bestaan. Dat vergt een
 * netwerkaanroep en hoort in de productie-audit, zoals `venture-adressen.ts`
 * dat voor hostnamen doet. Gemeten op 2026-08-20 stond er een dood adres in
 * (`twitter.com/juandiazllc`, 404 via x.com); dat is met de hand verwijderd,
 * niet door een poort. Zie de toelichting bij `ORG_SAME_AS`. */

const WORTEL = join(__dirname, "..", "..");
const MAPPEN = ["app", "components", "lib", "scripts"];

/** Bestanden die een persoonsnaam letterlijk mogen dragen, met reden. */
const NAAM_MAG_LETTERLIJK: Record<string, string> = {
  "lib/seo/branding.ts": "de bron zelf",
  "lib/i18n/dict.ts":
    "impressum — juridische lopende tekst in vier talen, geen schema-veld",
};

function bestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "node_modules" || naam === ".next") continue;
      uit.push(...bestanden(pad));
    } else if (/\.(tsx?|mjs)$/.test(naam) && !/\.test\.tsx?$/.test(naam)) {
      uit.push(pad);
    }
  }
  return uit;
}

function geleverdeBestanden(): { pad: string; tekst: string }[] {
  const uit: { pad: string; tekst: string }[] = [];
  for (const map of MAPPEN) {
    for (const pad of bestanden(join(WORTEL, map))) {
      uit.push({
        pad: relative(WORTEL, pad).split(sep).join("/"),
        tekst: readFileSync(pad, "utf8"),
      });
    }
  }
  return uit;
}

describe("de persoonsentiteit", () => {
  it("de constanten spreken elkaar niet tegen", () => {
    // Drie ingangen naar één knoop, dus drie verschillende strings.
    const alle = [PERSON_NAME, ...PERSON_ALTERNATE_NAMES];
    expect(new Set(alle).size, `dubbele naamvorm in ${alle.join(" | ")}`).toBe(alle.length);

    // De volle vorm hoort de canonieke te zijn, niet een alternatief.
    expect(PERSON_ALTERNATE_NAMES).not.toContain(PERSON_NAME);

    // `@id` moet absoluut en stabiel zijn; een relatieve of paginagebonden
    // identiteit maakt de knoop juist weer per pagina uniek.
    expect(PERSON_ID).toMatch(/^https:\/\/.+#.+$/);
    expect(ORG_ID).toMatch(/^https:\/\/.+#.+$/);
    expect(PERSON_ID).not.toBe(ORG_ID);
  });

  it("PERSON_URL is taal-geprefixt, want /about geeft 307", () => {
    // Dit wás het defect: twee van de vier knopen wezen naar /about, en dat
    // stuurt door naar /en/about. Een `url` die op een redirect uitkomt is een
    // zwakker signaal dan een die dat niet doet.
    expect(PERSON_URL).toMatch(/^https:\/\/[^/]+\/(en|nl|de|es)\/about$/);
    expect(PERSON_ID.startsWith(PERSON_URL)).toBe(true);
  });

  it("elke Person-knoop draagt PERSON_ID", () => {
    const zonder: string[] = [];
    for (const { pad, tekst } of geleverdeBestanden()) {
      const knopen = tekst.match(/"@type":\s*"Person"/g)?.length ?? 0;
      if (knopen === 0) continue;
      const geankerd = tekst.match(/"@id":\s*PERSON_ID/g)?.length ?? 0;
      if (geankerd !== knopen) {
        zonder.push(`${pad}: ${knopen} Person-knopen, ${geankerd}x PERSON_ID`);
      }
    }
    expect(
      zonder,
      "Een Person-knoop zonder gedeelde `@id` mag door een crawler als een " +
        "aparte persoon gelezen worden. Voeg `\"@id\": PERSON_ID` toe.",
    ).toEqual([]);
  });

  it("geen enkel bestand schrijft een persoonsnaam letterlijk uit", () => {
    const vormen = [PERSON_NAME, ...PERSON_ALTERNATE_NAMES.filter((n) => n.includes("Stefan"))];
    const treffers: string[] = [];
    for (const { pad, tekst } of geleverdeBestanden()) {
      if (pad in NAAM_MAG_LETTERLIJK) continue;
      for (const vorm of vormen) {
        if (tekst.includes(`"${vorm}"`)) treffers.push(`${pad} → "${vorm}"`);
      }
    }
    expect(
      treffers,
      "Lees de naam uit lib/seo/branding.ts. Drie losse literals is precies " +
        "hoe de vier knopen uit elkaar zijn gegroeid.",
    ).toEqual([]);
  });

  it("de organisatie en de persoon delen geen profielen", () => {
    // Een persoonlijke GitHub op de Organization vertelt Google dat het bedrijf
    // en de mens hetzelfde ding zijn. Tot 2026-08-20 stond dat er.
    const overlap = ORG_SAME_AS.filter((u) => PERSON_SAME_AS.includes(u));
    expect(overlap, `profiel op beide entiteiten: ${overlap.join(", ")}`).toEqual([]);
    expect(ORG_SAME_AS.length).toBeGreaterThan(0);
    expect(ORG_NAME).toContain("Juan Diaz");
  });
});
