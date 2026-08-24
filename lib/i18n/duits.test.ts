import { describe, it, expect } from "vitest";
import { DICT } from "./dict";
import { SECTORS } from "../sectors";
import { VENTURES } from "../ventures";
import { POSTS } from "../insights";

/* Twee poorten op het Duitse woordenboek.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Op 2026-08-20 lag de Duitse `/about` er zo bij dat de H1 hem
 * "Betreiber, Bauer, Gründer" noemde — operator, **boer**, oprichter — en de
 * Duitse homepage-description droeg "Bauerprobt", geen woord. Beide stonden
 * daar maanden. Ze kwamen aan het licht doordat ik toevallig tien sleutels
 * opensloeg voor iets anders, niet doordat iets ze tegenhield.
 *
 * Een test kan niet zien of Duits klópt; daar is een lezer voor nodig, en die
 * leesbeurt is gedaan. Wat een test wél kan, is de twee klassen bewaken die
 * mechanisch zijn:
 *
 *   1. De aanspreekvorm. De Duitse site is consequent Sie — 122 keer gemeten.
 *      Er stonden drie du-vormen tussen, en dat leest als drie verschillende
 *      schrijvers. Dit is een structurele regel, geen woordenlijst.
 *
 *   2. Een handvol woorden die zijn teruggedraaid, elk met de reden waarom.
 *      Bewust kort: een lange verboden-woordenlijst wordt een last en gaat
 *      vals alarm slaan. Wat hier staat, stond er echt en was echt fout.
 *
 * De poorten lezen `DICT.de` en niet de bestanden, zodat dit bestand zichzelf
 * niet kan laten struikelen over de woorden die het beschrijft. */

const de = DICT.de;
const waarden = Object.entries(de);

/* Woorden die iemand niet in de tekst mag laten terugkomen zonder eerst deze
 * regel weg te halen. Per woord de reden, want een verbod zonder reden wordt
 * over een jaar weggehaald door iemand die niet weet waarom het er stond. */
const NIET_MEER: Record<string, string> = {
  Bauer:
    'betekent boer. Stond in about.title.b als vertaling van "builder"; ' +
    'de bedoelde vorm is "Erbauer".',
  Bauerprobt:
    "bestaat niet. Stond in meta.home.description waar en/nl " +
    '"Construction-trained" / "Bouwkundig getraind" hebben.',
  Bauingenieurlich:
    "bestaat niet als bijwoord, en Bauingenieur is bovendien een ander vak " +
    "dan bouwmanagement. Gebruik “bautechnisch”.",
  Hotellerie:
    "derde woord voor dezelfde sector naast Hospitality (13×) en " +
    "Gastgewerbe (3×). Stond in tag.label.hospitality, dus in de H1 en de " +
    "titel van de tagpagina, terwijl de sectorpagina ernaast Hospitality zei.",
  Operatoren:
    "leest in het Duits als wiskundige of machine-operatoren. Het publiek " +
    "heet overal elders Betreiber (25×).",
};

/* De aanspreekvorm. Alleen losse woorden tellen, anders slaat "Individuum" of
 * "Dienst" alarm. Hoofdletters meegenomen: aan het begin van een zin staat er
 * "Du" en niet "du". */
const DU_VORMEN = ["du", "dir", "dich", "dein", "deine", "deinen", "deinem", "deiner", "deines"];

/** Splitst op alles wat geen letter is. Een regex-literal, geen opgebouwde
 *  string: die laatste gaat door string-escaping heen en dat is precies hoe
 *  een woordgrens-patroon hier eerder in een backspace-teken veranderde. */
function woorden(zin: string): string[] {
  return zin
    .replace(/<[^>]*>/g, " ") // html-tags eruit, anders telt em of span mee
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/)
    .filter(Boolean);
}

/* De twee controles staan hieronder EEN keer en worden door beide poorten
 * aangeroepen. Ze stonden er even twee keer -- een kopie in het woordenboek-
 * blok en een in het kopij-blok -- en dat is dezelfde fout als twee lijsten
 * die hetzelfde bewaken: ze lopen uiteen en dan bewaakt de zwakste. Het
 * mutatieharnas ving het doordat zijn anker plotseling 2x stond. */

const DU_UITLEG =
  "De Duitse site is Sie. Een du-vorm ertussen leest als een tweede " +
  "schrijver. Wil je hier bewust van afwijken, zet dan een uitzondering " +
  "met reden neer in plaats van de regel te verzachten.";

/** Elke plek waar de lezer met du wordt aangesproken. */
function duTreffers(strings: Array<[string, string]>): string[] {
  return strings
    .filter(([, v]) => woorden(v).some((w) => DU_VORMEN.includes(w)))
    .map(([k, v]) => `${k} → "${v.slice(0, 70)}"`);
}

/** Elke plek waar een teruggedraaid woord terugstaat, met de reden erachter. */
function verbodenTreffers(strings: Array<[string, string]>): string[] {
  const uit: string[] = [];
  for (const [woord, reden] of Object.entries(NIET_MEER)) {
    const laag = woord.toLowerCase();
    for (const [k, v] of strings) {
      if (woorden(v).includes(laag)) uit.push(`${k} → "${woord}": ${reden}`);
    }
  }
  return uit;
}

describe("het Duitse woordenboek", () => {
  /* Zonder deze twee zou alles hieronder slagen op een leeg woordenboek —
     precies de fout uit feedback_assert_niet_door_het_vangnet. */
  it("leest daadwerkelijk het Duitse blok", () => {
    expect(waarden.length).toBeGreaterThan(600);
    expect(de["about.title.b"]).toBeTruthy();
  });

  it("is werkelijk in de Sie-vorm geschreven", () => {
    const metSie = waarden.filter(([, v]) => /\b(Sie|Ihre|Ihnen|Ihrem|Ihren)\b/.test(v));
    expect(metSie.length, "geen enkele Sie-vorm gevonden; leest deze test wel Duits?").toBeGreaterThan(50);
  });

  it("spreekt de lezer nergens met du aan", () => {
    const gevonden = duTreffers(waarden);

    expect(
      gevonden,
      DU_UITLEG,
    ).toEqual([]);
  });

  it("draagt geen van de woorden die zijn teruggedraaid", () => {
    const gevonden = verbodenTreffers(waarden);
    expect(gevonden, "Zie de reden achter elk woord.").toEqual([]);
  });
});

/* ───────────────────────────────────────────────────────────────────────────
 * DERDE POORT: dezelfde twee regels, op de Duitse kopij die NIET in dict.ts staat.
 *
 * AANLEIDING. Op 2026-08-24 stond in `lib/sectors.ts` nog "Hotellerie & Revenue"
 * terwijl de sectorkaart ernaast — `sectors.h.title.a` in dit woordenboek — al
 * "Hospitality &" zei. Vier dagen nadat dat woord hierboven verboden werd, en op
 * twee pagina's die naar elkaar linken. De reparatie van 20 augustus raakte
 * `tag.label.hospitality` en niets anders, omdat de poort hierboven `DICT.de`
 * leest en de kopijmodules niet.
 *
 * Gemeten diezelfde dag stonden er ELF treffers buiten dict.ts: vier maal
 * Hotellerie in sectors.ts, en in insights.ts één Hotellerie plus zes maal
 * Operatoren — waaronder de titel én de samenvatting van een Duits artikel. Het
 * is dus geen randgeval; het is de helft van de vindplaatsen.
 *
 * Deze poort leest de geëxporteerde data en niet de bestandstekst, om precies
 * dezelfde reden als de twee hierboven: anders struikelt dit bestand over zijn
 * eigen toelichting, waarin de verboden woorden nu eenmaal moeten staan.
 *
 * Wat hij NIET ziet: of het Duits klopt. Daar is een lezer voor. En kopij in
 * een component in plaats van in een module — die klasse is van
 * `lib/i18n/kale-tekst.test.ts`.
 */

type Herkomst = [pad: string, tekst: string];

/** Elke string uit een boom, met het pad erheen, zodat een treffer vindbaar is. */
function plat(x: unknown, pad: string, uit: Herkomst[] = []): Herkomst[] {
  if (typeof x === "string") uit.push([pad, x]);
  else if (Array.isArray(x)) x.forEach((y, i) => plat(y, `${pad}[${i}]`, uit));
  else if (x && typeof x === "object")
    for (const [k, y] of Object.entries(x)) plat(y, `${pad}.${k}`, uit);
  return uit;
}

/* Let op de tweede tak bij insights: een post met `markets: ["de"]` draagt zijn
 * Duits in de BASISvelden en niet in `i18n.de` — de drie Heimspeicher-stukken
 * zijn zo geschreven. Zonder die tak scant deze poort de helft van de Duitse
 * artikelen niet, en dat zou hem stil half zo sterk maken. */
const KOPIJ: Array<[bestand: string, strings: Herkomst[]]> = [
  ["lib/sectors.ts", SECTORS.flatMap((s) => plat(s.i18n?.de ?? {}, s.slug))],
  ["lib/ventures.ts", VENTURES.flatMap((v) => plat(v.i18n?.de ?? {}, v.slug))],
  [
    "lib/insights.ts",
    POSTS.flatMap((p) => [
      ...plat(p.i18n?.de ?? {}, `${p.slug}:i18n`),
      ...(p.markets?.includes("de")
        ? plat({ title: p.title, summary: p.summary, body: p.body }, `${p.slug}:basis`)
        : []),
    ]),
  ],
];

describe.each(KOPIJ)("de Duitse kopij in %s", (bestand, strings) => {
  /* Zonder deze twee slaagt alles hieronder op een lege lijst — een accessor
     die per ongeluk niets oplevert leest dan als schone kopij.
     Zie feedback_assert_niet_door_het_vangnet. */
  it("levert daadwerkelijk Duitse strings op", () => {
    expect(strings.length, `${bestand} gaf niets terug; klopt het i18n-veld nog?`).toBeGreaterThan(
      50,
    );
  });

  it("is werkelijk Duits en in de Sie-vorm", () => {
    const metSie = strings.filter(([, v]) => /\b(Sie|Ihre|Ihnen|Ihrem|Ihren|Ihr)\b/.test(v));
    expect(metSie.length, `geen enkele Sie-vorm in ${bestand}; leest deze test wel Duits?`,
    ).toBeGreaterThan(3);
  });

  it("spreekt de lezer nergens met du aan", () => {
    const gevonden = duTreffers(strings);
    expect(
      gevonden,
      DU_UITLEG,
    ).toEqual([]);
  });

  it("draagt geen van de woorden die zijn teruggedraaid", () => {
    const gevonden = verbodenTreffers(strings);
    expect(gevonden, "Zie de reden achter elk woord.").toEqual([]);
  });
});

describe("de sector heet in het Duits maar één ding", () => {
  /* Dit is de assertie die het defect van 24 augustus rechtstreeks had gevangen.
   * De sectorkaart en de sectorpagina staan in twee verschillende bestanden en
   * niets legde ze naast elkaar; daardoor konden ze vier dagen uiteenlopen. */
  it("noemt hospitality op de kaart en op de pagina hetzelfde", () => {
    const kaart = de["sectors.h.title.a"]; // "Hospitality &"
    const pagina = SECTORS.find((s) => s.slug === "hospitality")?.i18n?.de?.name;

    expect(kaart, "sectors.h.title.a ontbreekt in DICT.de").toBeTruthy();
    expect(pagina, "hospitality heeft geen Duitse naam in lib/sectors.ts").toBeTruthy();

    const label = (s: string) => s.replace(/\s*[&·—-]\s*.*$/, "").trim();
    expect(
      label(pagina!),
      `De sectorkaart zegt "${kaart}" en de sectorpagina "${pagina}". Dat zijn ` +
        "twee namen voor één sector, op twee pagina's die naar elkaar linken.",
    ).toBe(label(kaart));
  });
});
