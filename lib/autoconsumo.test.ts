/**
 * AANLEIDING
 * Het ES-autoconsumo-cluster droeg sinds 20 juli 2026 als kernzin dat je je
 * overschot in Spanje niet verkoopt maar tot een plafond compenseert. Bij het
 * nameten in de geconsolideerde tekst van het RD 244/2019 op boe.es bleek de
 * eerste helft daarvan onjuist: artikel 13.4 kent een tweede modaliteit waarin
 * het overschot wel economisch vergoed wordt, en artikel 4.2.b zegt met zoveel
 * woorden dat je daar VRIJWILLIG voor mag kiezen. Daarbovenop stonden er twee
 * euro-per-kilowattuur-bereiken in de kopij die bij geen enkele uitvoerder na
 * te trekken zijn -- de CNMC publiceert geen compensatietarief, en het
 * reglement verwijst zelf naar een prijs tussen partijen (art. 14.3.i) of naar
 * een uurformule (art. 14.3.ii).
 *
 * WAT DEZE POORT DOET
 * Hij leest de geexporteerde data (getAllInsights + kopij), niet de
 * bestandstekst, zodat dit testbestand niet over zijn eigen toelichting
 * struikelt -- vier eerdere tekstscans in deze repo deden dat wel. De
 * toegestane wetsartikelen worden uit docs/claims.md GEPARSEERD in plaats van
 * hier overgeschreven, en de aftrek is dragend: art. 3.g.iii staat in een
 * groene rij (welk lid de wijziging raakte) EN in twee rode rijen (de tekst
 * ervan is niet betrouwbaar verkregen). Zonder die aftrek zou de kopij hem
 * mogen citeren.
 *
 * De verboden gelden cluster-breed (alle ES-artikelen met tag Energy), niet
 * alleen voor de gewijzigde stukken. Dat is strenger en het vangt drift naar
 * een vierde artikel dat er ooit in dezelfde tag naast komt te staan.
 *
 * WAT HIJ NIET DOET
 * Hij oordeelt niet over Spaans, en niet over de vraag of het BOE de
 * geconsolideerde tekst inmiddels opnieuw heeft bijgewerkt. Blijft claims.md
 * staan terwijl de werkelijkheid verschuift, dan is deze poort groen en toch
 * verouderd -- daarom staat de raadpleegdatum als eigen rij in de tabel en
 * schrijft de kalender een hermeting voor.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "./insights";
import { kopij } from "./insight-kopij";

const WORTEL = join(__dirname, "..");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf-8");

const RENDIMIENTO = "autoconsumo-con-bateria-rentabilidad-2026";
const COMPENSACION = "compensacion-de-excedentes-no-es-balance-neto";
const INSTALADORES = "autoconsumo-lo-que-los-instaladores-deben-explicar";
const ALLE = [RENDIMIENTO, COMPENSACION, INSTALADORES];

/** De sectie zelf, zodat een rij uit een buursectie niet meetelt. */
function sectie(): string {
  const kop = "### Autoconsumo en compensaci";
  const i = CLAIMS.indexOf(kop);
  if (i === -1)
    throw new Error(
      "docs/claims.md draagt geen autoconsumo-sectie meer. Kopij mag zijn bron niet overleven: " +
        "zet de sectie terug, of haal de artikel-, plafond- en modaliteitsclaims uit het " +
        "ES-Energiecluster.",
    );
  const rest = CLAIMS.slice(i + kop.length);
  const eind = rest.search(/\r?\n#+ /);
  return rest.slice(0, eind === -1 ? undefined : eind);
}

/** De tabelrijen van die sectie, elk als hele regel. */
function rijen(): string[] {
  return sectie()
    .split(/\r?\n/)
    .filter((r) => r.trimStart().startsWith("|") && !/^\s*\|[\s|:-]*\|\s*$/.test(r));
}

/**
 * Verwijzingen naar een wetsartikel, in het Spaans ("el articulo 14.3") en in
 * het Nederlands van claims.md ("art. 13.4"). Het jaartal in "RD 244/2019"
 * matcht bewust niet: dat is geen artikel maar het besluit zelf.
 */
export function artikelenIn(tekst: string): Set<string> {
  return new Set(
    [...tekst.matchAll(/\bart(?:ículo|iculo)?\.?\s+(\d+(?:\.[0-9a-z]+)*)/gi)].map((m) => m[1]),
  );
}

/** Wat de rode rijen expliciet uitsluiten -- vandaag art. 3.g.iii. */
function uitgeslotenArtikelen(): Set<string> {
  const uit = new Set<string>();
  for (const r of rijen()) if (r.includes("❌")) for (const a of artikelenIn(r)) uit.add(a);
  if (uit.size === 0)
    throw new Error(
      "Geen enkele rode rij in de autoconsumo-sectie noemt nog een artikel. De aftrek hieronder " +
        "is daarmee vacuum, en art. 3.g.iii -- waarvan de tekst niet betrouwbaar verkregen is -- " +
        "zou de kopij weer in mogen.",
    );
  return uit;
}

/** Groene rijen minus rode rijen. Een artikel in beide is niet geverifieerd. */
function toegestaneArtikelen(): Set<string> {
  const uitgesloten = uitgeslotenArtikelen();
  const uit = new Set<string>();
  for (const r of rijen())
    if (r.includes("✅"))
      for (const a of artikelenIn(r)) if (!uitgesloten.has(a)) uit.add(a);
  if (uit.size < 6)
    throw new Error(
      `De autoconsumo-sectie levert maar ${uit.size} geverifieerde artikelen op. De parser is ` +
        "stuk of de tabel is uitgekleed; in beide gevallen bewaakt deze poort niets meer.",
    );
  return uit;
}

/** De vermogensdrempels die de sectie vastlegt, vandaag 100 kW. */
function kwUitClaims(): Set<string> {
  const gevonden = [...sectie().matchAll(/\*\*.{0,4}?(\d+) kW\*\*/g)].map((m) => m[1]);
  if (gevonden.length < 1)
    throw new Error(
      "De autoconsumo-sectie legt geen enkele kW-drempel meer vast. De parser is stuk of de rij " +
        "over de vijf voorwaarden van art. 4.2.a is verdwenen.",
    );
  return new Set(gevonden);
}

const CLUSTER = getAllInsights("es").filter((p) => p.tag === "Energy");
const TEKST = new Map(CLUSTER.map((p) => [p.slug, kopij(p)] as const));

function tekstVan(slug: string): string {
  const t = TEKST.get(slug);
  if (t === undefined)
    throw new Error(
      `Het artikel ${slug} bestaat niet meer als ES-Energy-artikel. Hernoemen mag, maar dan moet ` +
        "deze poort mee -- anders bewaakt hij stil niets.",
    );
  return t;
}

describe("het ES-autoconsumo-cluster is meetbaar", () => {
  it("draagt de drie artikelen waar deze poort over gaat", () => {
    expect(CLUSTER.length).toBeGreaterThanOrEqual(3);
    for (const slug of ALLE) expect(TEKST.has(slug), slug).toBe(true);
    // Zonder deze ondergrens slaagt elke assertie hieronder ook op een lege lijst.
    for (const [slug, t] of TEKST) expect(t.length, slug).toBeGreaterThan(800);
  });

  it("de artikel-lezer vindt beide schrijfwijzen en niet het besluitnummer", () => {
    const s = artikelenIn("el artículo 14.3 del RD 244/2019, art. 4.2.b y el artículo 14, más 13.6");
    expect([...s].sort()).toEqual(["14", "14.3", "4.2.b"]);
    expect(artikelenIn("sin referencias").size).toBe(0);
  });
});

describe("de wetsverwijzingen komen uit docs/claims.md", () => {
  it("de rode rijen sluiten art. 3.g.iii uit, en de aftrek doet werk", () => {
    // Dat lid staat OOK in een groene rij (welk lid de wijziging raakte). Zonder
    // de aftrek zou het daarmee als geverifieerd gelden, terwijl de enige
    // raadpleging die zijn tekst gaf aantoonbaar de versie van voor 2026 was.
    expect(uitgeslotenArtikelen().has("3.g.iii")).toBe(true);
    expect(toegestaneArtikelen().has("3.g.iii")).toBe(false);
  });

  it("elk artikel dat de kopij noemt is geverifieerd", () => {
    const toegestaan = toegestaneArtikelen();
    for (const [slug, t] of TEKST) {
      const gevonden = [...artikelenIn(t)];
      expect(gevonden.length, slug).toBeGreaterThan(0);
      for (const a of gevonden)
        expect(
          toegestaan.has(a),
          `${slug} citeert artikel ${a}, en dat lid staat niet als geverifieerd in de ` +
            "autoconsumo-sectie van docs/claims.md. Meet het na in de geconsolideerde tekst op " +
            "boe.es en zet het daar neer, of haal het uit de kopij.",
        ).toBe(true);
    }
  });

  it("elk kW-getal in de kopij staat in de claims-tabel", () => {
    const toegestaan = kwUitClaims();
    for (const [slug, t] of TEKST)
      for (const m of t.matchAll(/(\d+)\s*(?:kW|kilovatios)\b/g))
        expect(
          toegestaan.has(m[1]),
          `${slug} publiceert ${m[1]} kW, en die drempel staat niet in de autoconsumo-sectie.`,
        ).toBe(true);
  });
});

describe("de zelfbeperkingen uit claims.md worden nagekomen", () => {
  it("noemt nergens een bedrag per kilowattuur", () => {
    for (const [slug, t] of TEKST) {
      expect(
        t.includes("€"),
        `${slug} draagt een euroteken. De CNMC publiceert geen compensatietarief en het ` +
          "reglement verwijst naar het contract; verwijs de lezer naar zijn eigen factura.",
      ).toBe(false);
      expect(
        [...t.matchAll(/\d+,\d+/g)].map((m) => m[0]),
        `${slug} publiceert een komma-decimaal. Elk bedrag in dit cluster moet eerst in de ` +
          "autoconsumo-sectie van docs/claims.md staan, en daar staat er geen.",
      ).toEqual([]);
    }
  });

  it("noemt geen afstandsgrens voor collectief autoconsumo", () => {
    for (const [slug, t] of TEKST)
      expect(
        [...t.matchAll(/\d+\s*(?:km|kilómetros|metros)\b/gi)].map((m) => m[0]),
        `${slug} noemt een afstand. Art. 3.g.iii is niet betrouwbaar verkregen; publiceer er ` +
          "geen getal uit.",
      ).toEqual([]);
  });

  it("beweert nergens dat het overschot niet verkocht kan worden", () => {
    // De kernzin van het cluster tot 1 september 2026. Art. 13.4 spreekt hem
    // tegen, en art. 4.2.b maakt de tweede modaliteit een vrijwillige keuze.
    for (const [slug, t] of TEKST)
      for (const verboden of [
        /no vendes tu excedente/i,
        /no (?:se )?puede[sn]? vender/i,
        /en España no se vende/i,
      ])
        expect(
          verboden.test(t),
          `${slug} beweert dat het overschot in Spanje niet verkocht wordt. Artikel 13.4 zegt dat ` +
            "de niet-gecompenseerde modaliteit er wel een vergoeding voor krijgt.",
        ).toBe(false);
  });

  it("de premisse onder die verboden staat nog in claims.md", () => {
    // Een verbod dat blijft staan nadat zijn reden verdween, wordt over een jaar
    // weggehaald door iemand die niet weet waarom het er stond.
    const s = sectie();
    expect(s).toContain("noem geen €/kWh-bereik");
    expect(s).toContain("noem geen afstand in km of meters");
    expect(s).toContain("citeer dit lid niet");
    expect(CLAIMS).toContain("Waarom art. 13.4 de rekensom van het cluster verandert");
  });
});

describe("de tweede modaliteit staat in het hele cluster", () => {
  it("elk artikel noemt artikel 13.4 en het plafond van 14.3", () => {
    for (const slug of ALLE) {
      const t = tekstVan(slug);
      expect(
        artikelenIn(t).has("13.4"),
        `${slug} rekent met de compensatie zonder de tweede modaliteit te noemen. Wie in de ` +
          "niet-gecompenseerde modaliteit zit, heeft aan die rekensom niets.",
      ).toBe(true);
      expect(artikelenIn(t).has("14.3"), slug).toBe(true);
    }
  });

  it("elk artikel draagt een kop met wat het niet beweert", () => {
    for (const slug of ALLE) expect(tekstVan(slug), slug).toContain("Lo que no afirmo aquí");
  });

  it("het compensatie-artikel legt de vrijwillige keuze uit", () => {
    // Zonder deze aanwezigheidseis slagen de verboden hierboven ook op kopij die
    // het onderwerp helemaal niet meer aanraakt.
    const t = tekstVan(COMPENSACION);
    expect(artikelenIn(t).has("4.2.b")).toBe(true);
    expect(t).toContain("voluntariamente");
  });
});
