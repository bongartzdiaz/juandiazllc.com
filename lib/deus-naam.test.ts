import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES, type Locale } from "@/lib/i18n/dict";
import { getAllInsights } from "@/lib/insights";
import { getSignals } from "@/lib/signals";
import { faqStrings } from "@/lib/seo/faqs";

// Het CRM heet DEUS sinds de rebrand; "Philly" bleef op de site achter als
// naam voor datzelfde product, naast een prijspagina die DEUS verkoopt.
// Op 2026-08-28 zijn de CRM-verwijzingen hernoemd, nadat de claims eronder
// waren nagemeten op DEUS-SHARED origin/main (964888e): de FAQ-modules
// bestaan echt (app/api/mls-feeds, app/soi, app/philanthropy/donors) en de
// provider is postgresql — dus "MariaDB via de Prisma-adapter" was onwaar.
//
// Wat "Philly" WEL mag betekenen, en waar:
//   - de stad (hero.chip.status "Amsterdam <-> Philly", marquee.full)
//   - de US-venture in aanbouw (ventures.v5.title, work.page.lede,
//     story.tl.philly.y, en lib/ventures.ts / lib/sectors.ts)
//   - now.ship.1 en de signals-regel: wachten op een beslissing van Juan
//     (zie de operator-lijst in CLAUDE.md) — vrijstelling met voorwaarde.
//
// Deze poort leest de geexporteerde data, niet de bestandstekst: een
// "Philly" in een toelichting is geen kopij en hoort onzichtbaar te zijn.
// Wat hij NIET kan zien: of DEUS-SHARED de modules blijft dragen — dat is
// op datum gemeten, geen levende koppeling.

const WORTEL = join(__dirname, "..");

// Sleutels waarvan de WAARDE "Philly" mag dragen, met de reden erbij.
// Exacte gelijkheid per taal: een zevende sleutel valt om, en een sleutel
// die zijn Philly kwijtraakt ook — dan is de vrijstelling niet meer waar.
const DICT_TOEGESTAAN: Record<string, string> = {
  "story.tl.philly.y": "tijdlijnlabel van de US-venture",
  "hero.chip.status": "de stad: Amsterdam <-> Philly",
  "marquee.full": "venture-lijst in de marquee",
  "work.page.lede": "zegt juist dat Philly nog in aanbouw is (#188)",
  "ventures.v5.title": "de naam van de US-venture",
  "now.ship.1":
    "wacht op beslissing: /now claimt Philly CRM v1.2 — versheid en naam zijn van Juan",
};

function dictSleutelsMetPhilly(l: Locale): string[] {
  const woordenboek = DICT[l] as Record<string, string>;
  return Object.keys(woordenboek)
    .filter((k) => woordenboek[k].includes("Philly"))
    .sort();
}

describe("de naam van het CRM is DEUS", () => {
  it("de artikelen noemen het CRM nergens meer Philly, en wel DEUS", () => {
    for (const l of LOCALES) {
      const plat = JSON.stringify(getAllInsights(l));
      expect(plat, `Philly in artikelen (${l})`).not.toContain("Philly");
      // Positieve controle: de drie hernoemde artikelen dragen DEUS echt —
      // anders is nul Philly ook te verklaren door een lege lijst.
      const deus = plat.split("DEUS").length - 1;
      expect(deus, `DEUS in artikelen (${l})`).toBeGreaterThanOrEqual(3);
    }
  });

  it("de FAQ's noemen het CRM nergens meer Philly, en wel DEUS", () => {
    for (const l of LOCALES) {
      const waarden = faqStrings(l).map(([, w]) => w);
      expect(waarden.length).toBeGreaterThan(30);
      const met = waarden.filter((w) => w.includes("Philly"));
      expect(met, `Philly in FAQ (${l})`).toEqual([]);
      expect(waarden.some((w) => w.includes("DEUS")), `DEUS in FAQ (${l})`).toBe(true);
    }
  });

  it("in dict.ts draagt precies de toegestane sleutelset nog Philly", () => {
    const verwacht = Object.keys(DICT_TOEGESTAAN).sort();
    for (const l of LOCALES) {
      expect(dictSleutelsMetPhilly(l), `dict (${l})`).toEqual(verwacht);
    }
  });

  it("signals draagt Philly precies eén keer per taal — vrijstelling met voorwaarde", () => {
    // "Every product I've shipped ... Philly" spreekt work.page.lede tegen
    // ("still in build"). Of dat DEUS wordt, de naam vervalt, of de zin
    // herschreven wordt, is een claim over wat geleverd is — van Juan.
    // Tot die beslissing: exact 1 per taal, zodat groei en stille
    // verwijdering allebei een zichtbare bewerking vergen.
    //
    // Het i18n-veld gaat eruit voor het tellen: localizeSignal spreidt de
    // basis inclusief i18n, dus de gemergde output draagt alle vertalingen
    // mee — geteld zonder strip is het altijd 4, ongeacht de taal. De
    // assertie hoort het gerenderde oppervlak per taal te meten.
    for (const l of LOCALES) {
      const plat = JSON.stringify(
        getSignals(l).map((s) => ({ ...s, i18n: undefined })),
      );
      expect(plat.split("Philly").length - 1, `signals (${l})`).toBe(1);
    }
  });

  it("de MariaDB-claim is weg, uit dict en van de /uses-pagina", () => {
    for (const l of LOCALES) {
      const woordenboek = DICT[l] as Record<string, string>;
      const met = Object.keys(woordenboek).filter((k) =>
        woordenboek[k].includes("MariaDB"),
      );
      expect(met, `MariaDB in dict (${l})`).toEqual([]);
    }
    const usesPagina = readFileSync(
      join(WORTEL, "app", "[locale]", "uses", "page.tsx"),
      "utf8",
    );
    expect(usesPagina).not.toContain("MariaDB");
    expect(usesPagina).toContain("PostgreSQL");
  });
});
