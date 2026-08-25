import { describe, it, expect } from "vitest";
import { DICT, LOCALES, type Locale } from "@/lib/i18n/dict";
import { SERVICES_FAQ_BY_LOCALE } from "./faqs";

/* De symptoomzinnen staan op twee plekken, en dat is opzet.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `/services` toont per dienst één symptoom — `services.<slug>.symptom` in
 * `dict.ts`. Het routeringsantwoord in de SERVICES-FAQ citeert diezelfde vier
 * zinnen om de bezoeker van symptoom naar dienst te leiden. Dat citaat ís de
 * waarde: wie op de pagina "Een leverancierscontract op je bureau" leest en
 * even later hetzelfde in de FAQ ziet, herkent zijn eigen geval.
 *
 * AANLEIDING. Op 24 augustus veranderde `services.advisory.symptom` (es) van
 * "sobre la mesa" naar "sobre tu mesa". De FAQ droeg de oude zin nog, en dat
 * bleef staan tot een productiemeting hem terugvond — een halve middag voor
 * één woord. Geen enkele poort keek ernaar: de taalpoorten lezen registers,
 * niet gelijkheid tussen twee bestanden.
 *
 * WAT DEZE POORT NIET EIST. Niet dat één bepaald antwoord alle vier draagt.
 * Splitst iemand het routeringsantwoord in vieren, dan is dat geen defect —
 * de eis is dat de zin ergens in de SERVICES-FAQ van die taal staat.
 *
 * DE APOSTROF WORDT GENORMALISEERD, en dat is geen verzwakking om de poort
 * groen te krijgen. Gemeten op 24 augustus: `faqs.ts` schrijft 9× de rechte
 * apostrof en 0× de krul, `dict.ts` 94× recht en 11× krul. Alleen
 * `services.engine.symptom` (en) valt aan de krulkant, en `don’t` tegen
 * `don't` is een typografisch verschil en geen inhoudelijk. Welke van de twee
 * vormen huisstijl is, is een aparte vraag over de hele codebase; die wordt
 * hier niet stilzwijgend beantwoord. */

/** Rechte apostrof, zodat `don’t` en `don't` als dezelfde zin tellen. */
export function eenApostrof(tekst: string): string {
  return tekst.replace(/[‘’]/g, "'");
}

/** De slugs waarvoor `dict.ts` een symptoomzin draagt — afgeleid, niet ingetypt. */
function symptoomSlugs(l: Locale): string[] {
  return Object.keys(DICT[l])
    .map((k) => /^services\.([^.]+)\.symptom$/.exec(k)?.[1])
    .filter((s): s is string => Boolean(s))
    .sort();
}

const antwoorden = (l: Locale) => (SERVICES_FAQ_BY_LOCALE[l] ?? []).map((it) => it.a);

describe("de FAQ citeert de symptoomzinnen van /services", () => {
  it("normaliseert alleen de apostrof en verder niets", () => {
    /* Zonder deze drie is elke groene uitkomst hieronder ook te verklaren door
       een normalisator die te veel gelijkmaakt. */
    expect(eenApostrof("don’t")).toBe("don't");
    expect(eenApostrof("don't")).toBe("don't");
    expect(eenApostrof("Números en los que no confías")).toBe("Números en los que no confías");
  });

  it("leidt in elke taal dezelfde vier slugs af", () => {
    const en = symptoomSlugs("en");
    expect(
      en.length,
      "geen enkele services.*.symptom gevonden — de afleiding is stuk, " +
        "en dan slaagt de test hieronder op een lege lijst",
    ).toBeGreaterThanOrEqual(4);
    for (const l of LOCALES) {
      expect(symptoomSlugs(l), `${l} draagt andere symptoomsleutels dan en`).toEqual(en);
    }
  });

  it("draagt elke symptoomzin ergens in de SERVICES-FAQ van diezelfde taal", () => {
    const mis: string[] = [];
    for (const l of LOCALES) {
      const tekst = antwoorden(l).map(eenApostrof);
      for (const slug of symptoomSlugs(l)) {
        const zin = eenApostrof(DICT[l][`services.${slug}.symptom`] ?? "");
        if (zin === "" || !tekst.some((a) => a.includes(zin))) {
          mis.push(`${l} services.${slug}.symptom :: ${zin || "(leeg)"}`);
        }
      }
    }
    expect(
      mis,
      "Deze symptoomzinnen staan op /services maar worden door geen enkel " +
        "SERVICES-FAQ-antwoord in die taal geciteerd. Werk het antwoord bij in " +
        "lib/seo/faqs.ts — of, als de zin bewust anders moet luiden, haal het " +
        "citaat dan uit de FAQ in plaats van deze verwachting op te rekken.",
    ).toEqual([]);
  });

  it("vindt een verzonnen symptoomzin níét", () => {
    /* De vorige test slaagt ook wanneer `includes` alles waar maakt. */
    const tekst = antwoorden("en").map(eenApostrof);
    expect(tekst.some((a) => a.includes("A vendor contract on your windowsill"))).toBe(false);
  });
});
