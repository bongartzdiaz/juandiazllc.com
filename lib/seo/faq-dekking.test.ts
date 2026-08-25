import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { faqStrings } from "./faqs";
import { LOCALES, type Locale } from "@/lib/i18n/dict";

/* Dekking van `faqStrings`, de uitlezer waarmee de drie taalpoorten dit bestand
 * lezen.
 *
 * AANLEIDING. `lib/seo/faqs.ts` stond tot 24 augustus in geen enkele taalpoort:
 * 58 strings per taal die niemand las. Het kostte wat je verwacht — de vier
 * sector-FAQ's spraken het bedrijf met ustedes aan terwijl HOME, CONTACT en
 * SERVICES in hetzelfde bestand vosotros zeiden.
 *
 * WAAROM DIT EEN TEKSTSCAN IS. `faqStrings` noemt zijn vier bronnen met de
 * hand. Voegt iemand een vijfde `*_BY_LOCALE`-export toe en vergeet hij die
 * regel, dan leest de poort stil minder en wordt er niets rood. Een
 * module-import kan dat per definitie niet zien: hij kent alleen wat er
 * geïmporteerd wordt. De bestandstekst kent de export wél. Zelfde reden als bij
 * `components/sections/Ventures.test.ts`, waar een tweede lijst náást de eerste
 * stond en alleen een tekstscan hem kon vinden. */

const BRON = readFileSync(join(__dirname, "faqs.ts"), "utf8");

/** Namen van elke taalgesleutelde FAQ-export, zonder het `_BY_LOCALE`-achtervoegsel. */
function exportNamen(tekst: string): string[] {
  return [...tekst.matchAll(/export const ([A-Z_]+)_BY_LOCALE\b/g)].map((m) =>
    m[1].replace(/_FAQ$/, ""),
  );
}

describe("faqStrings leest elke taalgesleutelde FAQ-export", () => {
  it("vindt de exports werkelijk in de bestandstekst", () => {
    /* Zonder deze drie is een lege ongedekt-lijst hieronder niet te
       onderscheiden van een regex die niets vindt — en dan slaagt de
       dekkingstest altijd, juist wanneer er iets mis is. */
    expect(exportNamen(BRON).length).toBeGreaterThanOrEqual(4);
    expect(exportNamen("export const HOME_FAQ_BY_LOCALE: X = {};")).toEqual(["HOME"]);
    expect(exportNamen("export const HOME_FAQ: FaqItem[] = [];")).toEqual([]);
  });

  it("dekt elke export met minstens één uitgelezen pad", () => {
    const paden = faqStrings("en").map(([p]) => p);
    const ongedekt = exportNamen(BRON).filter(
      (naam) => !paden.some((p) => p === naam || p.startsWith(`${naam}[`) || p.startsWith(`${naam}.`)),
    );
    expect(
      ongedekt,
      "Deze exports staan in lib/seo/faqs.ts maar komen niet uit faqStrings. " +
        "Zolang dat zo is lezen de drie taalpoorten die kopij niet — voeg ze " +
        "toe aan faqStrings in plaats van deze verwachting op te rekken.",
    ).toEqual([]);
  });

  it("levert in elke taal evenveel strings", () => {
    /* Loopt dit uiteen, dan mist een taal een vraag of een antwoord — en dan
       koppelt de gekoppelde regel in spaans.test.ts stilzwijgend niets meer
       voor die sleutel. */
    const per = LOCALES.map((l: Locale) => [l, faqStrings(l).length] as const);
    const aantallen = new Set(per.map(([, n]) => n));
    expect(aantallen.size, `gemeten: ${per.map(([l, n]) => `${l}=${n}`).join(" ")}`).toBe(1);
    expect([...aantallen][0]).toBeGreaterThanOrEqual(50);
  });
});
