/**
 * AANLEIDING
 * Het DE-Heimspeicher-cluster rekende sinds 20 juli 2026 met een vergoeding en
 * een degressie zonder dat er over dat onderwerp ook maar een rij in
 * docs/claims.md stond. Bij het nameten bij de Bundesnetzagentur bleek een
 * cijfer verouderd, een marktcijfer bij de uitvoerder niet na te trekken, en
 * er ontbrak een wetsartikel dat de hele rekensom raakt: paragraaf 51 EEG zet
 * de vergoeding op nul zodra de spotprijs negatief is. Dat weglaten maakte de
 * batterijcase zwakker dan hij is, in teksten die de lezer juist vragen
 * eerlijk te rekenen.
 *
 * WAT DEZE POORT DOET
 * Hij leest de geexporteerde data (getAllInsights + kopij), niet de
 * bestandstekst, zodat dit testbestand niet over zijn eigen toelichting
 * struikelt -- vier eerdere tekstscans in deze repo deden dat wel. De cijfers
 * en datums worden uit docs/claims.md GEPARSEERD in plaats van hier
 * overgeschreven: een tweede kopie van hetzelfde getal is precies de
 * bugklasse waarvoor claims.md bestaat.
 *
 * De verboden gelden cluster-breed (alle DE-artikelen met tag Energy), niet
 * alleen voor de twee gewijzigde stukken. Dat is strenger en het vangt drift
 * naar het solarpflicht-artikel dat er in dezelfde tag naast staat.
 *
 * WAT HIJ NIET DOET
 * Hij oordeelt niet over Duits en niet over de vraag of de Bundesnetzagentur
 * haar sätze inmiddels heeft bijgesteld. Blijft claims.md staan terwijl de
 * werkelijkheid verschuift, dan is deze poort groen en toch verouderd -- de
 * kalender schrijft daarom een halfjaarlijkse hermeting voor.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "./insights";
import { kopij } from "./insight-kopij";

const WORTEL = join(__dirname, "..");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf-8");

const HEIMSPEICHER = "heimspeicher-wirtschaftlichkeit-2026";
const TARIEF = "dynamische-stromtarife-wann-lohnt-es-sich";

/** De sectie zelf, zodat een rij uit een buursectie niet meetelt. */
function sectie(): string {
  const kop = "### Einspeiseverg";
  const i = CLAIMS.indexOf(kop);
  if (i === -1)
    throw new Error(
      "docs/claims.md draagt geen Einspeisevergutung-sectie meer. Kopij mag zijn bron niet " +
        "overleven: zet de sectie terug, of haal de vergoedings- en paragraaf-51-claims uit " +
        "het DE-Energiecluster.",
    );
  const rest = CLAIMS.slice(i + kop.length);
  const eind = rest.search(/\r?\n#+ /);
  return rest.slice(0, eind === -1 ? undefined : eind);
}

/** De Cent-waarden die de sectie vastlegt, bv. 7,70 en 12,22. */
function centUitClaims(): Set<string> {
  const gevonden = [...sectie().matchAll(/\*\*(\d+,\d+) ct\/kWh\*\*/g)].map((m) => m[1]);
  if (gevonden.length < 2)
    throw new Error(
      "De Einspeisevergutung-sectie levert minder dan twee ct/kWh-waarden op. De parser is " +
        "stuk of de tabel is uitgekleed; in beide gevallen bewaakt deze poort niets meer.",
    );
  return new Set(gevonden);
}

/** De vetgedrukte Duitse datums die de sectie vastlegt. */
function datumsUitClaims(): Set<string> {
  const gevonden = [...sectie().matchAll(/\*\*(\d{1,2}\. \p{L}+ \d{4})\*\*/gu)].map((m) => m[1]);
  if (gevonden.length < 7)
    throw new Error(
      "De Einspeisevergutung-sectie levert minder dan zeven vetgedrukte datums op. De parser " +
        "is stuk of de tabel is uitgekleed.",
    );
  return new Set(gevonden);
}

/**
 * Zinnen, met de Duitse datum heel gehouden. Een naieve split op '. ' knipt
 * '1. Februar 2027' doormidden, en dan meet je het scheidingsteken in plaats
 * van de zin.
 */
export function zinnen(tekst: string): string[] {
  const ruw = tekst.split(/(?<=[.!?])\s+/);
  const uit: string[] = [];
  for (const stuk of ruw) {
    if (uit.length && /\d\.$/.test(uit[uit.length - 1])) uit[uit.length - 1] += " " + stuk;
    else uit.push(stuk);
  }
  return uit;
}

const CLUSTER = getAllInsights("de").filter((p) => p.tag === "Energy");
const TEKST = new Map(CLUSTER.map((p) => [p.slug, kopij(p)] as const));

function tekstVan(slug: string): string {
  const t = TEKST.get(slug);
  if (t === undefined)
    throw new Error(
      `Het artikel ${slug} bestaat niet meer als DE-Energy-artikel. Hernoemen mag, maar dan ` +
        "moet deze poort mee -- anders bewaakt hij stil niets.",
    );
  return t;
}

describe("het DE-Energiecluster is meetbaar", () => {
  it("draagt minstens vier artikelen en beide gewijzigde stukken", () => {
    expect(CLUSTER.length).toBeGreaterThanOrEqual(4);
    expect(TEKST.has(HEIMSPEICHER)).toBe(true);
    expect(TEKST.has(TARIEF)).toBe(true);
    // Zonder deze ondergrens slaagt elke assertie hieronder ook op een lege lijst.
    for (const [slug, t] of TEKST) expect(t.length, slug).toBeGreaterThan(500);
  });

  it("de zinsplitser houdt een Duitse datum heel", () => {
    expect(zinnen("Am 1. Februar 2027 faellt die Stufe. Danach sehen wir weiter.")).toEqual([
      "Am 1. Februar 2027 faellt die Stufe.",
      "Danach sehen wir weiter.",
    ]);
    expect(zinnen("Eins. Zwei.")).toEqual(["Eins.", "Zwei."]);
  });
});

describe("de cijfers komen uit docs/claims.md", () => {
  it("elk gepubliceerd Cent-cijfer staat in de claims-tabel", () => {
    const toegestaan = centUitClaims();
    for (const [slug, t] of TEKST) {
      const gevonden = [...t.matchAll(/(\d+(?:,\d+)?)\s*(?:Cent|ct)\b/g)].map((m) => m[1]);
      for (const c of gevonden)
        expect(
          toegestaan.has(c),
          `${slug} publiceert ${c} Cent, en die waarde staat niet in de Einspeisevergutung-sectie ` +
            "van docs/claims.md. Meet hem na bij de Bundesnetzagentur en zet hem daar neer, of " +
            "haal hem uit de kopij.",
        ).toBe(true);
    }
  });

  it("het Heimspeicher-stuk noemt de vergoeding die claims.md vastlegt", () => {
    // Zonder deze aanwezigheidseis slaagt de test hierboven ook op nul cijfers.
    const teil = [...sectie().matchAll(/Teileinspeisung[^|]*\|\s*\*\*(\d+,\d+) ct\/kWh\*\*/g)].map(
      (m) => m[1],
    );
    expect(teil).toHaveLength(1);
    expect(tekstVan(HEIMSPEICHER)).toContain(`${teil[0]} Cent`);
  });

  it("elke Duitse datum in de twee gewijzigde stukken staat in de claims-tabel", () => {
    const toegestaan = datumsUitClaims();
    for (const slug of [HEIMSPEICHER, TARIEF]) {
      const gevonden = [...tekstVan(slug).matchAll(/\d{1,2}\. \p{L}+ \d{4}/gu)].map((m) => m[0]);
      expect(gevonden.length, slug).toBeGreaterThan(0);
      for (const d of gevonden)
        expect(
          toegestaan.has(d),
          `${slug} noemt ${d}, en die datum staat niet in de Einspeisevergutung-sectie van ` +
            "docs/claims.md.",
        ).toBe(true);
    }
  });
});

describe("de zelfbeperkingen uit claims.md worden nagekomen", () => {
  it("noemt nergens een Cent-bereik voor de eindprijs", () => {
    // Strikt genomen dekt de Cent-test hierboven dit al. Deze staat er apart om
    // de operator de reden te geven in plaats van een onbekend getal.
    for (const [slug, t] of TEKST)
      expect(
        [...t.matchAll(/\d+\s*bis\s*\d+\s*Cent/g)].map((m) => m[0]),
        `${slug} publiceert een Cent-bereik voor de eindprijs. De Bundesnetzagentur geeft daar ` +
          "geen kopcijfer voor; verwijs de lezer naar zijn eigen Arbeitspreis.",
      ).toEqual([]);
  });

  it("draagt het verouderde vergoedingscijfer niet meer", () => {
    for (const [slug, t] of TEKST) expect(t, slug).not.toContain("rund 8 Cent");
  });

  it("suggereert geen minimumduur voor de nulstelling", () => {
    for (const [slug, t] of TEKST) {
      expect(t, slug).not.toMatch(/aufeinanderfolgend/i);
      for (const m of t.matchAll(/(.{0,6})Mindestdauer/g))
        expect(
          m[1],
          `${slug} noemt een Mindestdauer zonder ontkenning ervoor. Paragraaf 51 EEG kent er ` +
            "geen: de vergoeding is nul vanaf het eerste uur.",
        ).toContain("ohne ");
    }
  });

  it("noemt geen kW-drempel in een zin over paragraaf 14a", () => {
    for (const [slug, t] of TEKST)
      for (const z of zinnen(t))
        if (/14a/.test(z))
          expect(
            [...z.matchAll(/\d+\s*(?:kW|Kilowatt)/g)].map((m) => m[0]),
            `${slug} koppelt een kW-getal aan paragraaf 14a EnWG. De opsomming in de wet noemt ` +
              "er geen; noem er dus ook geen.",
          ).toEqual([]);
  });

  it("de premisse onder die twee verboden staat nog in claims.md", () => {
    // Een verbod dat blijft staan nadat zijn reden verdween, wordt over een jaar
    // weggehaald door iemand die niet weet waarom het er stond.
    const s = sectie();
    expect(s).toMatch(/Hoogte van die volgende stap \| \*\*niet vastgesteld\*\*/);
    expect(s).toMatch(/Zahlungszeitraum[^|]*\| \*\*niet vastgesteld\*\*/);
    expect(s).toMatch(/de opsomming noemt geen kW-drempel/);
  });
});

describe("paragraaf 51 EEG staat in het cluster", () => {
  it("wordt in beide gewijzigde stukken genoemd", () => {
    for (const slug of [HEIMSPEICHER, TARIEF])
      expect(
        tekstVan(slug),
        `${slug} rekent met de Einspeisevergutung zonder paragraaf 51 EEG te noemen. In uren met ` +
          "een negatieve spotprijs is die vergoeding nul, en dat verandert de rekensom.",
      ).toContain("51 EEG");
  });

  it("beide stukken dragen een kop met wat ze niet beweren", () => {
    for (const slug of [HEIMSPEICHER, TARIEF])
      expect(tekstVan(slug), slug).toContain("Was ich hier nicht behaupte");
  });
});
