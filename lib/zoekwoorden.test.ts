import { describe, it, expect } from "vitest";
import { DICT, LOCALES } from "./i18n/dict";
import { getVenture } from "./ventures";
import { TITLE_BUDGET } from "./seo/branding";

/* Poort: de titels van de twee gereedschappen blijven in de taal van de vraag.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Gemeten op 2026-09-22 (`docs/keyword-doelen.md` §2). Drie van de
 * vier talen droegen op `/tools/energy-roi` het woord waarmee iemand zo'n
 * pagina zoekt — "calculator", "Rechner", "Calculadora". Het Nederlands droeg
 * "de saldeer-som". Dat woord kwam in deze hele repo precies één keer voor:
 * in die titel. De pagina eronder gebruikt het niet, de beschrijving niet, de
 * artikelen niet. Een titel die een woord draagt dat nergens anders bestaat,
 * kan alleen gevonden worden door wie hem al kent.
 *
 * WAT DEZE POORT BEWAAKT, en waarom elk punt:
 *
 *   1. Elke taal blijft binnen TITLE_BUDGET. Google toont ~60 tekens en
 *      `app/layout.tsx` plakt TITLE_SUFFIX erachter; wie de titel verlengt om
 *      er nóg een term in te proppen, verliest de staart die hij bedoelde.
 *   2. Elke taal draagt een werkwoord of gereedschapsnaam uit háár eigen
 *      lijst. Dit is de regressie die hierboven beschreven staat: zonder deze
 *      controle kan het Nederlands terugzakken naar een zelfstandig naamwoord
 *      terwijl de andere drie blijven staan, en dat valt niemand op.
 *   3. Het Nederlands draagt de officiële naam van de regeling. "Saldering"
 *      alleen is korter maar het is niet hoe de wet heet, en het is niet wat
 *      er op de energienota staat.
 *   4. De rekenmachine en de veldgids-portfoliopagina dragen NIET dezelfde
 *      titel. Dat zijn twee eigen pagina's op één zoekterm; welke van de twee
 *      dan wint is willekeurig. Zie §3 van dat document voor de derde
 *      deelnemer aan diezelfde term — `salderingsregeling2027.nl` — en waarom
 *      díé beslissing niet in een test hoort maar bij Juan.
 *
 * Wat deze poort NIET kan zien: of er ook werkelijk op gezocht wordt. Er is
 * geen DataForSEO, geen Ahrefs-abonnement en geen geverifieerde Search
 * Console, dus er staat in dat document geen enkel volume — en hier dus ook
 * geen drempel die op een volume lijkt. Wat hier wordt bewaakt is dat de
 * woorden uit de taal van de lezer komen, niet uit de onze.
 *
 * Bewust rechtstreeks op DICT en niet via translate(): die valt per ontwerp
 * terug op het Engels, dus een ontbrekende Nederlandse sleutel zou de Engelse
 * waarde teruggeven en deze test zou groen blijven. Zie
 * [[feedback_assert_niet_door_het_vangnet]]. */

const SLEUTEL = "meta.energyRoi.title";

/** Per taal de woorden waarvan er minstens één in de titel moet staan. Geen
 *  van deze lijsten is een synoniemenlijst voor de vertaler: het zijn de
 *  woorden die een lezer intikt als hij zo'n ding zoekt. */
const ACTIEWOORD: Record<string, readonly string[]> = {
  en: ["calculator", "calculate"],
  nl: ["berekenen", "bereken", "rekentool"],
  de: ["Rechner", "berechnen"],
  es: ["Calculadora", "calcula"],
};

describe("de rekenmachine heet in elke taal wat de lezer intikt", () => {
  for (const l of LOCALES) {
    const titel = DICT[l][SLEUTEL];

    it(`${l} — de sleutel bestaat en is niet leeg`, () => {
      expect(Object.hasOwn(DICT[l], SLEUTEL), `${SLEUTEL} ontbreekt in ${l}`).toBe(true);
      expect(titel?.trim()).toBeTruthy();
    });

    it(`${l} — past binnen TITLE_BUDGET (${TITLE_BUDGET})`, () => {
      expect(titel.length, `"${titel}" is ${titel.length} tekens`).toBeLessThanOrEqual(TITLE_BUDGET);
    });

    it(`${l} — draagt een actiewoord`, () => {
      const kandidaten = ACTIEWOORD[l];
      expect(kandidaten, `geen actiewoordenlijst voor ${l}`).toBeTruthy();
      const raak = kandidaten.some((w) => titel.toLowerCase().includes(w.toLowerCase()));
      expect(raak, `"${titel}" bevat geen van ${JSON.stringify(kandidaten)}`).toBe(true);
    });
  }

  it("nl — noemt de regeling bij haar wettelijke naam", () => {
    expect(DICT.nl[SLEUTEL]).toContain("Salderingsregeling");
    expect(DICT.nl[SLEUTEL]).toContain("2027");
  });

  it("de vier titels verschillen van elkaar", () => {
    const titels = LOCALES.map((l) => DICT[l][SLEUTEL]);
    expect(new Set(titels).size, `dubbele titel: ${JSON.stringify(titels)}`).toBe(LOCALES.length);
  });
});

describe("geen twee eigen pagina's op dezelfde titel", () => {
  for (const l of LOCALES) {
    it(`${l} — rekenmachine en veldgids dragen niet dezelfde titel`, () => {
      const gids = getVenture("salderingsregeling-2027", l)?.seoTitle;
      expect(gids, "de veldgids-venture bestaat niet meer").toBeTruthy();
      expect(DICT[l][SLEUTEL]).not.toBe(gids);
    });
  }
});

describe("het woord dat nergens bestond, komt niet terug", () => {
  it("geen enkele kopijwaarde draagt nog 'saldeer-som'", () => {
    // Op de WAARDEN en niet op de bestandstekst. Een scan op de bron zou hier
    // over de eigen toelichting struikelen — de kop van dit bestand noemt het
    // woord immers om uit te leggen waarom het weg is. Vier eerdere
    // tekstscans in deze repo deden precies dat; zie de kop van
    // lib/einspeiseverguetung.test.ts.
    //
    // Niet de hele repo: lib/insights.ts draagt "saldeervoordeel" en
    // "saldeertarief", en dat zijn echte woorden uit de energiewereld.
    for (const l of LOCALES) {
      for (const [sleutel, waarde] of Object.entries(DICT[l])) {
        expect(waarde, `${l}:${sleutel}`).not.toContain("saldeer-som");
      }
    }
  });
});
