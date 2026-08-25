import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/* Typografische aanhalingstekens horen niet in de bron.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Op 24 augustus liep een vergelijking tussen `dict.ts` en
 * `lib/seo/faqs.ts` op één teken stuk: het rechtertypografische enkele
 * aanhalingsteken (U+2019) tegen de rechte apostrof, in dezelfde zin
 * `Numbers you don't trust`. Gemeten was het geen smaakkwestie maar een
 * uitschieter — `faqs.ts` schreef 9× recht en 0× krul, `dict.ts` 94× recht en
 * 11× krul, en de andere kopijmodules uitsluitend recht.
 *
 * DE BESLISSING (2026-08-25, Juan): recht, overal. Eerst de apostrof, daarna
 * de dubbele aanhalingstekens.
 *
 * DE DUBBELE ZIJN NIET DEZELFDE KLASSE ALS DE APOSTROF, en die nuance is de
 * reden dat de foutmelding hieronder per soort een andere vervanging noemt.
 * Bij de apostrof is elk voorkomen inwisselbaar. Bij de dubbele hangt de juiste
 * vorm af van waar het teken staat, en de codebase had voor allebei al een
 * conventie:
 *
 *   citaat IN kopij die de bezoeker leest    -> de rechte, geëscaped
 *                                               (`dict.ts`, 38 keer)
 *   sier-aanhalingstekens ROND een JSX-blok  -> `&ldquo;` / `&rdquo;`
 *                                               (`Story.tsx`, `Testimonials.tsx`)
 *
 * Die twee zijn niet uitwisselbaar. In een React-tekstknoop rendert `&ldquo;`
 * als letterlijke tekst, dus daar is de entiteit onbruikbaar; in JSX-markup
 * rendert hij als het teken en is hij juist de nette vorm. Eén regel "alles
 * recht" zou de tweede categorie stukmaken — vandaar dat de foutmelding beide
 * paden noemt in plaats van er één.
 *
 * WAAROM DIT EEN TEKSTSCAN IS. Het gaat om een teken in de bron, niet om een
 * waarde die een module exporteert. Een import ziet beide vormen gewoon als
 * string; alleen de bestandstekst kan het verschil laten zien.
 *
 * GEEN UITZONDERINGSLIJST, en dat is met opzet mogelijk gemaakt. Een poort die
 * een teken verbiedt moet dat teken normaal gesproken zelf dragen om te kunnen
 * bewijzen dat hij werkt — en dan heeft hij een uitzondering voor zichzelf
 * nodig, precies de constructie waar dit logboek al vier keer over struikelde
 * (`contactadressen`, `persoon-entiteit`, `verzoeklimiet`, `server-acties`).
 * Hier worden de verboden tekens uit hun codepunt opgebouwd, dus dit bestand is
 * zelf schoon en wordt gewoon meegescand. Nul uitzonderingen betekent hier ook
 * werkelijk nul.
 *
 * U+201E STAAT ER OOK IN. Dat is het Duitse openende onderaanhalingsteken, en
 * `DICT.de` gebruikt het vandaag nul keer — de Duitse kopij volgt dezelfde
 * geëscapete conventie als de andere drie talen. Wil iemand ooit echte Duitse
 * aanhalingstekens, dan is dat een bewuste beslissing over vier talen en wordt
 * deze poort aangepast, niet omzeild.
 *
 * TESTBESTANDEN TELLEN MEE, anders dan bij `wees-sleutels.test.ts`. Daar gaat
 * het om afnemers en is een test geen afnemer; hier gaat het om een teken en
 * telt elke regel.
 *
 * MARKDOWN VALT ERBUITEN. `CLAUDE.md` en `AGENTS.md` dragen logboekregels die
 * dit verschil beschrijven en juist een krul nodig hebben om het te kunnen
 * tonen; dat is geschiedenis en wordt niet herschreven. `_drafts/` draagt één
 * Duitse pitch met U+201E, wat daar de correcte vorm is. Markdown rendert
 * bovendien geen sitekopij. Gemeten op 25 augustus: zeven treffers in `.md`,
 * nul in `.ts`/`.tsx`. */

const WORTEL = join(__dirname, "..");
const MAPPEN = ["app", "components", "lib", "scripts"];

/** Opgebouwd uit codepunten zodat dit bestand zelf schoon blijft. */
const ENKEL = [String.fromCharCode(0x2018), String.fromCharCode(0x2019)];
const DUBBEL = [
  String.fromCharCode(0x201c),
  String.fromCharCode(0x201d),
  String.fromCharCode(0x201e),
];

function bestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "node_modules" || naam === ".next") continue;
      uit.push(...bestanden(pad));
    } else if (/\.tsx?$/.test(naam)) {
      uit.push(pad);
    }
  }
  return uit;
}

const BRONNEN = MAPPEN.flatMap((m) => bestanden(join(WORTEL, m))).map((p) =>
  relative(WORTEL, p).split(sep).join("/"),
);

/** Elke regel met een van `tekens`, als `pad:regelnummer  inhoud`. */
function treffers(paden: string[], tekens: string[]): string[] {
  const uit: string[] = [];
  for (const pad of paden) {
    const regels = readFileSync(join(WORTEL, pad), "utf8").split("\n");
    regels.forEach((regel, i) => {
      if (tekens.some((k) => regel.includes(k))) {
        uit.push(`${pad}:${i + 1}  ${regel.trim().slice(0, 90)}`);
      }
    });
  }
  return uit;
}

describe("typografie: aanhalingstekens zijn recht", () => {
  it("leest werkelijk een substantiële bronboom", () => {
    /* Zonder deze twee is een lege treffer-lijst hieronder niet te
       onderscheiden van een wandeling die niets vond. */
    expect(BRONNEN.length).toBeGreaterThan(150);
    expect(BRONNEN).toContain("lib/i18n/dict.ts");
  });

  it("ziet een gekruld teken wanneer dat er is, en een recht niet", () => {
    /* De scanner wordt hier op zijn eigen logica getest, niet op de boom:
       zonder dit slagen de tests hieronder ook met een kapot patroon. */
    const heeft = (s: string, ks: string[]) => ks.some((k) => s.includes(k));
    expect(heeft(`Numbers you don${ENKEL[1]}t trust`, ENKEL)).toBe(true);
    expect(heeft(`Numbers you don${ENKEL[0]}t trust`, ENKEL)).toBe(true);
    expect(heeft("Numbers you don't trust", ENKEL)).toBe(false);
    expect(heeft(`hij zei ${DUBBEL[0]}ja${DUBBEL[1]}`, DUBBEL)).toBe(true);
    expect(heeft(`hij zei ${DUBBEL[2]}ja`, DUBBEL)).toBe(true);
    expect(heeft('hij zei "ja"', DUBBEL)).toBe(false);
    /* De twee sets raken elkaar niet. Zonder dit kan een apostrof-treffer als
       dubbel gelden, en dan wijst de foutmelding de verkeerde vervanging aan. */
    expect(heeft(`don${ENKEL[1]}t`, DUBBEL)).toBe(false);
    expect(heeft(`${DUBBEL[0]}ja${DUBBEL[1]}`, ENKEL)).toBe(false);
    expect(ENKEL[1].charCodeAt(0)).toBe(0x2019);
    expect(DUBBEL[0].charCodeAt(0)).toBe(0x201c);
  });

  it("draagt nergens in app, components, lib of scripts een gekrulde apostrof", () => {
    expect(
      treffers(BRONNEN, ENKEL),
      "Vervang het teken door een rechte apostrof ('). De hele codebase " +
        "schrijft recht sinds 2026-08-25; een krul die erin sluipt komt " +
        "meestal uit geplakte tekst uit een tekstverwerker of een browser.",
    ).toEqual([]);
  });

  it("draagt nergens een gekruld dubbel aanhalingsteken", () => {
    expect(
      treffers(BRONNEN, DUBBEL),
      "Er zijn TWEE juiste vervangingen, en welke het is hangt af van waar het " +
        "teken staat. Citeer je binnen kopij die de bezoeker leest, gebruik dan " +
        "het rechte teken, geescaped — zoals dict.ts dat 38 keer doet. Zet je " +
        "sier-aanhalingstekens rondom een JSX-blok, gebruik dan &ldquo; en " +
        "&rdquo; — zoals Story.tsx en Testimonials.tsx. Die twee zijn niet " +
        "uitwisselbaar: in een React-tekstknoop rendert een entiteit als " +
        "letterlijke tekst.",
    ).toEqual([]);
  });
});
