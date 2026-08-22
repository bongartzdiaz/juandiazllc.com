import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES, type Locale } from "@/lib/i18n/dict";
import { LAST_VERIFIED, MAX_AGE_DAYS } from "@/components/Capacity";

// Capaciteit staat sinds 2026-08-22 op de site: drie trajecten tegelijk.
// Beslist door Juan, vastgelegd in docs/claims.md onder "Garantie en
// capaciteit". Die beslissing draagt twee grenzen, en die zijn hier de kern:
//
//   1. een levende telling van lopende trajecten bestaat nergens in deze repo,
//      dus "nog N plekken vrij" is per definitie verzonnen;
//   2. de grens knelt vandaag niet — marketing.leads stond op de dag van de
//      beslissing op nul rijen — dus een zin die druk suggereert, verzint druk.
//
// De zin mag daarom de werkwijze beschrijven en verder niets.
const WORTEL = join(__dirname, "..");
const SLEUTEL = "services.how.capaciteit";

// Het getal komt uit claims.md en wordt niet overgeschreven. Een tweede kopie
// van dit getal in dit bestand is precies de bugklasse die claims.md bestaat
// om te voorkomen.
const WOORD_NAAR_GETAL: Record<string, number> = {
  een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6,
};
const GETAL_PER_TAAL: Record<number, Record<Locale, string>> = {
  1: { en: "one", nl: "een", de: "ein", es: "un" },
  2: { en: "two", nl: "twee", de: "zwei", es: "dos" },
  3: { en: "three", nl: "drie", de: "drei", es: "tres" },
  4: { en: "four", nl: "vier", de: "vier", es: "cuatro" },
  5: { en: "five", nl: "vijf", de: "fünf", es: "cinco" },
  6: { en: "six", nl: "zes", de: "sechs", es: "seis" },
};

function claims(): string {
  return readFileSync(join(WORTEL, "docs", "claims.md"), "utf8");
}

function capaciteitUitClaims(): number {
  const m = claims().match(/\|\s*trajecten tegelijk\s*\|\s*\*\*(\w+)\*\*/);
  if (!m) {
    throw new Error(
      "docs/claims.md draagt geen rij `| trajecten tegelijk | **…** |` meer, " +
        "terwijl de site een capaciteit publiceert. Herstel de rij of haal de zin uit de kopij.",
    );
  }
  const n = WOORD_NAAR_GETAL[m[1].toLowerCase()];
  if (!n) throw new Error(`onbekend telwoord in claims.md: "${m[1]}"`);
  return n;
}

// Woorden uit een zin halen via een regex-literal. Bewust niet via een uit een
// template literal gebouwde RegExp: daarin is `\b` het backspace-teken en geen
// woordgrens, en zo'n poort kan per definitie niet falen. Zie het logboek van
// 2026-08-20.
function woorden(zin: string): Set<string> {
  return new Set(zin.toLowerCase().split(/[^a-zà-ÿ]+/).filter(Boolean));
}

// Vormen die schaarste als druk verkopen in plaats van als werkwijze. Elk met
// een bewijstekst, zodat een term die stukgaat zichtbaar wordt in plaats van
// stil te verdwijnen.
const DRUKTAAL: ReadonlyArray<{ term: string; bewijs: string }> = [
  { term: "spots? (left|available|remaining)", bewijs: "only 2 spots left" },
  // Toegevoegd nadat de getelde uitzondering een gat aanwees: het Engelse
  // label luidt "slots remaining" en viel onder geen enkele term, waardoor de
  // uitzondering 0 telde in en en 1 in nl. Ongelijke taaldekking is stil.
  { term: "slots? (left|remaining|available)", bewijs: "2 slots remaining" },
  { term: "places? remaining", bewijs: "3 places remaining" },
  { term: "only \\d+ (left|remaining)", bewijs: "only 1 left" },
  { term: "plekken? (vrij|over|beschikbaar)", bewijs: "nog 2 plekken vrij" },
  { term: "nog \\d+ (plek|plaats)", bewijs: "nog 1 plek" },
  { term: "pl(ä|a)tze frei", bewijs: "noch 2 Plätze frei" },
  { term: "nur noch \\d+", bewijs: "nur noch 1 Mandat" },
  { term: "plazas? (libres?|disponibles?)", bewijs: "quedan 2 plazas libres" },
  { term: "solo quedan \\d+", bewijs: "solo quedan 2" },

  { term: "act (now|fast)", bewijs: "act now" },
  { term: "(schrijf|wees) er snel bij", bewijs: "wees er snel bij" },
];
const DRUK = new RegExp(DRUKTAAL.map((t) => t.term).join("|"), "i");

describe("de capaciteitszin", () => {
  it("noemt het getal uit docs/claims.md, in het woord van elke taal", () => {
    const n = capaciteitUitClaims();
    expect(n, "claims.md levert geen bruikbaar getal").toBeGreaterThan(0);

    // Eerst de meetlat: een woordsplitser die niets vindt leest hetzelfde als
    // kopij die het getal netjes noemt.
    expect(woorden("Er lopen drie opdrachten tegelijk.").has("drie")).toBe(true);
    expect(woorden("Es laufen drei Mandate.").has("drei")).toBe(true);
    expect(woorden("Er lopen opdrachten tegelijk.").has("drie")).toBe(false);

    for (const l of LOCALES) {
      const zin = DICT[l][SLEUTEL];
      expect(zin, `${SLEUTEL} ontbreekt voor ${l}`).toBeTruthy();
      const verwacht = GETAL_PER_TAAL[n][l];
      expect(
        woorden(zin).has(verwacht),
        `${SLEUTEL} (${l}) noemt "${verwacht}" niet, terwijl docs/claims.md ` +
          `${n} trajecten tegelijk vastlegt: "${zin}"`,
      ).toBe(true);
    }
  });

  it("geen enkele plek in kopij verkoopt schaarste als druk", () => {
    for (const { term, bewijs } of DRUKTAAL) {
      expect(
        new RegExp(term, "i").test(bewijs),
        `term "${term}" gaat niet af op zijn eigen bewijs "${bewijs}" — de term is stuk`,
      ).toBe(true);
      expect(
        DRUK.test(bewijs),
        `"${bewijs}" komt niet door DRUK — term "${term}" is uit het patroon verdwenen`,
      ).toBe(true);
    }
    expect(
      DRUK.test("Er lopen drie opdrachten tegelijk."),
      "patroon gaat af op de capaciteitszin zelf",
    ).toBe(false);
    expect(
      DRUKTAAL.length,
      "de druktaal-lijst is gewijzigd — schrap je bewust een term, pas dan dit getal aan",
    ).toBe(12);

    // `fomo.capacity.*` valt buiten de scan, en dat is geen gunst maar een
    // voorwaarde die het waarmaakt. components/Capacity.tsx toont vier
    // blueprint-plekken per kwartaal met het aantal dat nog vrij is, en draagt
    // daarvoor een onderhouden bron (SLOTS_REMAINING), een houdbaarheidsdatum
    // (LAST_VERIFIED) en een poort die rood wordt zodra die veroudert.
    //
    // Toen deze poort werd geschreven stond in docs/claims.md dat zo’n telling
    // "nergens in deze repo bestaat". Dat was onwaar en is daar gecorrigeerd.
    // De regel is niet "geen aftellend getal" maar "geen aftellend getal zonder
    // onderhouden bron".
    // Getoetst op het feit, niet op de aanwezigheid van een ander testbestand.
    // Een tekstscan op "MAX_AGE_DAYS" kan "bewaking bestaat" niet onderscheiden
    // van "bewaking uitgehold"; dit wel. Dat components/capacity.test.ts
    // hetzelfde nagaat is geen dubbeling maar de reden dat de uitzondering hier
    // mag staan — verdwijnt de versheid, dan vervalt de uitzondering.
    const dagenOud = (Date.now() - Date.parse(LAST_VERIFIED)) / 86_400_000;
    expect(
      dagenOud,
      `de uitzondering voor fomo.capacity.* leunt op een onderhouden telling, maar ` +
        `SLOTS_REMAINING is ${Math.floor(dagenOud)} dagen niet tegen de agenda ` +
        `gehouden (max ${MAX_AGE_DAYS}). Werk het getal bij of haal de zin weg.`,
    ).toBeLessThanOrEqual(MAX_AGE_DAYS);

    const BUITEN_SCAN: ReadonlyArray<{ voorvoegsel: string; aantal: number }> = [
      { voorvoegsel: "fomo.capacity.", aantal: 1 },
    ];
    for (const { voorvoegsel, aantal } of BUITEN_SCAN) {
      for (const l of LOCALES) {
        const n = Object.entries(DICT[l]).filter(
          ([k, v]) => k.startsWith(voorvoegsel) && DRUK.test(v),
        ).length;
        expect(
          n,
          `uitzondering "${voorvoegsel}" (${l}) staat op ${aantal} — gevonden ${n}. ` +
            `Een tweede aftellend getal onder hetzelfde voorvoegsel mag niet stil meeliften.`,
        ).toBe(aantal);
      }
    }

    for (const l of LOCALES) {
      const overtreders = Object.entries(DICT[l]).filter(
        ([k, v]) =>
          !BUITEN_SCAN.some(({ voorvoegsel }) => k.startsWith(voorvoegsel)) &&
          DRUK.test(v),
      );
      expect(
        overtreders.map(([k]) => k),
        `kopij (${l}) suggereert een aftellend getal zonder onderhouden bron — ` +
          `zie docs/claims.md, "Garantie en capaciteit"`,
      ).toEqual([]);
    }
  });

  // Een zin die nergens rendert is geen kopij maar dood gewicht. Zelfde reden
  // als de wees-controle in scripts/seo-audit.ts.
  it("de zin wordt werkelijk gerenderd op /services", () => {
    const pagina = readFileSync(
      join(WORTEL, "app", "[locale]", "services", "page.tsx"),
      "utf8",
    );
    expect(
      pagina.includes(`t("${SLEUTEL}")`),
      `${SLEUTEL} staat in het woordenboek maar wordt nergens op /services gerenderd`,
    ).toBe(true);
  });

  it("docs/claims.md draagt de beslissing waar deze zin op leunt", () => {
    const c = claims();
    for (const woord of ["Garantie en capaciteit", "trajecten tegelijk"]) {
      expect(
        c.includes(woord),
        `docs/claims.md legt "${woord}" niet vast terwijl de site de capaciteit publiceert`,
      ).toBe(true);
    }
  });
});
