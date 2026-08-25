import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES, type Locale } from "@/lib/i18n/dict";
import { LAST_VERIFIED, MAX_AGE_DAYS, TOTAL_SLOTS } from "@/components/Capacity";

// Capaciteit staat sinds 2026-08-22 op de site. Op 2026-08-23 is het één getal
// geworden: /contact telde vier blueprint-gesprekken per kwartaal terwijl
// /services drie trajecten tegelijk noemde — twee eenheden voor hetzelfde
// onderwerp, op naburige pagina's. Beide oppervlakken lezen nu hetzelfde feit
// uit docs/claims.md, onder "Garantie en capaciteit".
//
// Twee grenzen horen bij dat getal, en die zijn hier de kern:
//
//   1. een aftellend getal mag alleen met een ONDERHOUDEN bron. Dat is geen
//      verbod maar een voorwaarde, en components/Capacity.tsx voldoet eraan:
//      SLOTS_REMAINING, LAST_VERIFIED en MAX_AGE_DAYS samen. De eerste versie
//      van dit commentaar zei dat zo'n telling "nergens in deze repo bestaat" —
//      onwaar, en precies de fout die dit bestand elders bewaakt.
//   2. de grens knelt vandaag niet — marketing.leads stond op de dag van de
//      beslissing op nul rijen — dus een zin die druk suggereert, verzint druk.
//
// De zin op /services mag daarom de werkwijze beschrijven en verder niets.
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

// Bewust `matchAll` en niet `match`. De eerste versie las met `match()` de
// eerste treffer en zweeg over de rest — en tijdens de gelijktrekking van
// 2026-08-23 schreef ik prompt een tweede rij met hetzelfde getal erbij. Toen
// klopte het toevallig nog; met een afwijkend getal in de tweede rij was het
// een stille leugen geweest, want de poort had de eerste gelezen en niets
// gemeld. Eén feit, één rij, en dat wordt hier afgedwongen.
function capaciteitUitClaims(): number {
  const treffers = [
    ...claims().matchAll(/\|\s*trajecten tegelijk\s*\|\s*\*\*(\w+)\*\*/g),
  ];
  if (treffers.length === 0) {
    throw new Error(
      "docs/claims.md draagt geen rij `| trajecten tegelijk | **…** |` meer, " +
        "terwijl de site een capaciteit publiceert. Herstel de rij of haal de zin uit de kopij.",
    );
  }
  if (treffers.length > 1) {
    throw new Error(
      `docs/claims.md draagt ${treffers.length} rijen \`| trajecten tegelijk | **…** |\` ` +
        `(${treffers.map((t) => t[1]).join(", ")}). Eén feit hoort op één plek te staan; ` +
        "een tweede rij wordt door elke lezer die de eerste pakt stil overgeslagen.",
    );
  }
  const n = WOORD_NAAR_GETAL[treffers[0][1].toLowerCase()];
  if (!n) throw new Error(`onbekend telwoord in claims.md: "${treffers[0][1]}"`);
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

  // Dit is de assertie die "gelijk zetten" onomkeerbaar maakt. Vóór 2026-08-23
  // stond TOTAL_SLOTS op 4 en claims.md op drie, en géén poort merkte dat:
  // components/capacity.test.ts hield het getal alleen tegen de kopij ernáást,
  // dus vier plekken met "vier per kwartaal" erbij was intern consistent en
  // extern in strijd met de beslissing. Twee lijsten die hetzelfde feit dragen,
  // precies de bugklasse waar dit logboek het vaakst op valt.
  // Eén feit, één woord. Bij het gelijktrekken op 2026-08-23 zei /services
  // "drie opdrachten tegelijk" en /contact "drie trajecten tegelijk":
  // hetzelfde getal, twee woorden, op precies de twee pagina's die één feit
  // moesten dragen. Het getal was aan beide kanten gedekt, het zelfstandig
  // naamwoord niet — en een lezer die twee woorden ziet mag twee grenzen
  // vermoeden.
  //
  // Engels, Duits en Spaans liepen al gelijk; alleen het Nederlands week af.
  // Dat is de reden dat dit vier literals zijn en geen taalregel: de drift kan
  // in elke taal ontstaan en is alleen per taal te zien. Het gekozen woord
  // volgt docs/claims.md, dat 5x "trajecten" schrijft en 0x "opdrachten".
  const CAPACITEITSWOORD: Record<Locale, string> = {
    en: "engagements",
    nl: "trajecten",
    de: "mandate",
    es: "encargos",
  };

  it("beide oppervlakken noemen het feit met hetzelfde woord", () => {
    // Eerst de meetlat: een substringcheck die altijd waar is, meet niets.
    expect("Er lopen drie trajecten tegelijk.".toLowerCase().includes("trajecten")).toBe(true);
    expect("Er lopen drie opdrachten tegelijk.".toLowerCase().includes("trajecten")).toBe(false);

    for (const l of LOCALES) {
      const woord = CAPACITEITSWOORD[l];
      for (const k of [SLEUTEL, "fomo.capacity.note"]) {
        const zin = DICT[l][k];
        expect(zin, `${k} ontbreekt voor ${l}`).toBeTruthy();
        expect(
          zin.toLowerCase().includes(woord),
          `${k} (${l}) noemt "${woord}" niet, terwijl het andere oppervlak hetzelfde ` +
            `feit draagt. Eén capaciteitsfeit hoort overal hetzelfde te heten: "${zin}"`,
        ).toBe(true);
      }
    }
  });

  it("de balk op /contact tekent hetzelfde aantal als docs/claims.md vastlegt", () => {
    const n = capaciteitUitClaims();
    expect(
      TOTAL_SLOTS,
      `components/Capacity.tsx tekent ${TOTAL_SLOTS} plekken terwijl docs/claims.md ` +
        `${n} trajecten tegelijk vastlegt. Er is één bron: pas claims.md aan, niet de constante.`,
    ).toBe(n);
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
    // voorwaarde die het waarmaakt. components/Capacity.tsx toont sinds
    // 2026-08-23 hetzelfde feit als /services — drie trajecten tegelijk — met
    // het aantal dat nog vrij is, en draagt daarvoor een onderhouden bron
    // (SLOTS_REMAINING), een houdbaarheidsdatum (LAST_VERIFIED) en een poort
    // die rood wordt zodra die veroudert.
    //
    // Toen deze poort werd geschreven stond in docs/claims.md dat zo'n telling
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
