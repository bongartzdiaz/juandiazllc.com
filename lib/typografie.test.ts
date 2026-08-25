import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/* De apostrof is recht, overal.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Op 24 augustus liep een vergelijking tussen `dict.ts` en
 * `lib/seo/faqs.ts` op één teken stuk: het rechtertypografische enkele
 * aanhalingsteken (U+2019) tegen de rechte apostrof, in dezelfde zin
 * `Numbers you don't trust`. Gemeten was het geen smaakkwestie maar een
 * uitschieter — `faqs.ts` schreef 9× recht en 0× krul, `dict.ts` 94× recht en
 * 11× krul, en de andere kopijmodules uitsluitend recht. Elf sleutels tegen de
 * rest van de codebase.
 *
 * DE BESLISSING (2026-08-25, Juan): recht, overal. De elf zijn omgezet en deze
 * poort houdt het zo.
 *
 * WAAROM DIT EEN TEKSTSCAN IS. Het gaat om een teken in de bron, niet om een
 * waarde die een module exporteert. Een import ziet beide vormen gewoon als
 * string; alleen de bestandstekst kan het verschil laten zien.
 *
 * GEEN UITZONDERINGSLIJST, en dat is met opzet mogelijk gemaakt. Een poort die
 * een teken verbiedt moet dat teken normaal gesproken zelf dragen om te kunnen
 * bewijzen dat hij werkt — en dan heeft hij een uitzondering voor zichzelf
 * nodig, precies de constructie waar dit logboek al drie keer over struikelde
 * (`contactadressen`, `persoon-entiteit`, `verzoeklimiet`). Hier worden de
 * verboden tekens uit hun codepunt opgebouwd, dus dit bestand is zelf schoon en
 * wordt gewoon meegescand. Nul uitzonderingen betekent hier ook werkelijk nul.
 *
 * TESTBESTANDEN TELLEN MEE, anders dan bij `wees-sleutels.test.ts`. Daar gaat
 * het om afnemers en is een test geen afnemer; hier gaat het om een teken en
 * telt elke regel.
 *
 * MARKDOWN VALT ERBUITEN. `CLAUDE.md` en `AGENTS.md` dragen logboekregels die
 * dit verschil beschrijven en juist een krul nodig hebben om het te kunnen
 * tonen; dat is geschiedenis en wordt niet herschreven. Markdown rendert
 * bovendien geen sitekopij. Gemeten op 25 augustus: drie treffers in `.md`,
 * nul in `.ts`/`.tsx`. */

const WORTEL = join(__dirname, "..");
const MAPPEN = ["app", "components", "lib", "scripts"];

/** U+2018 en U+2019, opgebouwd uit hun codepunt zodat dit bestand schoon blijft. */
const KRUL = [String.fromCharCode(0x2018), String.fromCharCode(0x2019)];

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

/** Elke regel met een gekrulde apostrof, als `pad:regelnummer  inhoud`. */
function krulTreffers(paden: string[]): string[] {
  const uit: string[] = [];
  for (const pad of paden) {
    const regels = readFileSync(join(WORTEL, pad), "utf8").split("\n");
    regels.forEach((regel, i) => {
      if (KRUL.some((k) => regel.includes(k))) {
        uit.push(`${pad}:${i + 1}  ${regel.trim().slice(0, 90)}`);
      }
    });
  }
  return uit;
}

describe("typografie: de apostrof is recht", () => {
  it("leest werkelijk een substantiële bronboom", () => {
    /* Zonder deze twee is een lege treffer-lijst hieronder niet te
       onderscheiden van een wandeling die niets vond. */
    expect(BRONNEN.length).toBeGreaterThan(150);
    expect(BRONNEN).toContain("lib/i18n/dict.ts");
  });

  it("ziet een krul wanneer die er is, en een rechte apostrof niet", () => {
    /* De scanner wordt hier op zijn eigen logica getest, niet op de boom:
       zonder dit slaagt de test hieronder ook met een kapot patroon. */
    const heeftKrul = (s: string) => KRUL.some((k) => s.includes(k));
    expect(heeftKrul(`Numbers you don${KRUL[1]}t trust`)).toBe(true);
    expect(heeftKrul(`Numbers you don${KRUL[0]}t trust`)).toBe(true);
    expect(heeftKrul("Numbers you don't trust")).toBe(false);
    expect(KRUL[1].charCodeAt(0)).toBe(0x2019);
  });

  it("draagt nergens in app, components, lib of scripts een gekrulde apostrof", () => {
    expect(
      krulTreffers(BRONNEN),
      "Vervang het teken door een rechte apostrof ('). De hele codebase " +
        "schrijft recht sinds 2026-08-25; een krul die erin sluipt komt " +
        "meestal uit geplakte tekst uit een tekstverwerker of een browser.",
    ).toEqual([]);
  });
});
