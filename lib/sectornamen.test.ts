import { describe, it, expect } from "vitest";
import { DICT, LOCALES, type Locale } from "./i18n/dict";
import { SECTORS } from "./sectors";

/* Een sector draagt zijn naam op twee plekken in twee bestanden: de kaart op
 * `/sectors` komt uit `DICT` (`sectors.<pre>.title.a` + `.title.b`), de pagina
 * waar hij naartoe linkt uit `lib/sectors.ts`. Niets legde die twee naast
 * elkaar, en daardoor liepen ze uiteen:
 *
 *   nl   kaart "Hospitality & omzet"   pagina "Horeca & revenue"
 *   de   kaart "Hospitality & Umsatz"  pagina "Hospitality & Revenue"
 *
 * De Nederlandse week op allebei de helften af, de Duitse alleen op de tweede.
 * Dat verschil is verklaarbaar: de voorganger van deze poort stond in
 * `lib/i18n/duits.test.ts`, keek alleen naar Duits, en knipte bovendien alles
 * weg vanaf de `&` — dus de helft die hij las was toevallig de helft die klopte.
 *
 * Deze poort leest alle sectoren in alle talen en vergelijkt de HELE naam. */

/* De koppeling slug -> dict-voorvoegsel is niet uit de slug af te leiden
 * (`real-estate` heet `sectors.re`, `adjacent` heet `sectors.adj`). Hij staat
 * daarom hier, met een test eronder die eist dat hij elke sector dekt — anders
 * ontsnapt een vijfde sector stilzwijgend aan deze hele poort. */
const VOORVOEGSEL: Record<string, string> = {
  energy: "sectors.e",
  "real-estate": "sectors.re",
  hospitality: "sectors.h",
  adjacent: "sectors.adj",
};

/* Waar de kaart bewust iets anders zegt dan de pagina. Elke uitzondering draagt
 * zijn reden, en de test eronder eist dat hij in ALLE talen opgaat: repareert
 * iemand hem in één taal, dan is de uitzondering niet meer waar en valt de
 * poort om in plaats van stil te blijven staan. */
const BEWUST_ANDERS: Record<string, string> = {
  adjacent:
    'De kaart is een uitnodiging ("Anywhere else", "Ergens anders", "Überall ' +
    'sonst", "Cualquier otro sitio"), de pagina de formele sectornaam ' +
    '("Adjacent sectors"). Dat is opzet in alle vier de talen.',
};

/* Voegwoorden tellen niet mee. De kaarten schrijven overal `&`; de Spaanse
 * paginanamen gebruiken het juiste Spaanse voegwoord (`y`, en `e` vóór een
 * woord dat met i- begint — "Hostelería e ingresos"). Dat is beter Spaans en
 * geen naamverschil, dus het mag deze poort niet rood maken. */
const VOEGWOORDEN = new Set(["&", "en", "und", "y", "e", "and"]);

/**
 * De kaarttitel staat in twee sleutels omdat hij over twee regels rendert.
 * Eindigt de eerste helft op een koppelteken, dan is dat een afbreking van één
 * woord ("Vast-" + "goed" = Vastgoed), geen twee woorden.
 */
export function kaartTitel(a: string, b: string): string {
  return a.endsWith("-") ? a.slice(0, -1) + b : `${a} ${b}`;
}

/** De betekenisdragende woorden van een naam, kleingeschreven. */
export function naamWoorden(naam: string): string[] {
  return naam
    .replace(/&amp;/g, "&")
    .toLowerCase()
    .split(/[^a-zà-ÿ&]+/)
    .filter(Boolean)
    .filter((w) => !VOEGWOORDEN.has(w));
}

function paginaNaam(slug: string, l: Locale): string | undefined {
  const s = SECTORS.find((x) => x.slug === slug);
  if (!s) return undefined;
  return l === "en" ? s.name : s.i18n?.[l]?.name;
}

function kaartNaam(slug: string, l: Locale): string | undefined {
  const pre = VOORVOEGSEL[slug];
  const a = DICT[l]?.[`${pre}.title.a`];
  const b = DICT[l]?.[`${pre}.title.b`];
  return a && b ? kaartTitel(a, b) : undefined;
}

describe("de normalisator zelf", () => {
  /* Zonder deze drie is elke groene uitkomst hieronder ook te verklaren door
     een normalisator die alles gelijkmaakt. Zie feedback_verify_the_measuring_stick. */
  it("plakt een afgebroken woord aan elkaar", () => {
    expect(kaartTitel("Vast-", "goed")).toBe("Vastgoed");
    expect(kaartTitel("Immo-", "bilien")).toBe("Immobilien");
  });

  it("laat een gewone tweewoordige titel met spatie staan", () => {
    expect(kaartTitel("Hospitality &", "omzet")).toBe("Hospitality & omzet");
  });

  it("negeert het voegwoord maar niet de naam", () => {
    expect(naamWoorden("Energía y solar")).toEqual(["energía", "solar"]);
    expect(naamWoorden("Hostelería e ingresos")).toEqual(["hostelería", "ingresos"]);
    expect(naamWoorden("Hospitality & omzet")).toEqual(["hospitality", "omzet"]);
    /* En hij maakt niet zomaar alles gelijk: */
    expect(naamWoorden("Horeca & revenue")).not.toEqual(naamWoorden("Hospitality & omzet"));
  });
});

describe("elke sector is gedekt", () => {
  it("kent voor elke sector een dict-voorvoegsel", () => {
    const zonder = SECTORS.map((s) => s.slug).filter((slug) => !VOORVOEGSEL[slug]);
    expect(
      zonder,
      "Een sector zonder voorvoegsel wordt door deze hele poort overgeslagen. " +
        "Vul VOORVOEGSEL aan met de sleutel uit lib/i18n/dict.ts.",
    ).toEqual([]);
  });

  it("verwijst nergens naar een sector die niet bestaat", () => {
    const slugs = new Set(SECTORS.map((s) => s.slug));
    expect(Object.keys(VOORVOEGSEL).filter((slug) => !slugs.has(slug))).toEqual([]);
    expect(Object.keys(BEWUST_ANDERS).filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it("draagt precies één bewuste uitzondering", () => {
    /* Een tweede uitzondering hoort een zichtbare bewerking te kosten, niet
       stilzwijgend mee te liften op deze regel. */
    expect(Object.keys(BEWUST_ANDERS)).toEqual(["adjacent"]);
  });
});

describe.each(SECTORS.map((s) => s.slug))("de sector %s heet overal hetzelfde", (slug) => {
  const uitzondering = BEWUST_ANDERS[slug];

  it.each(LOCALES)("heeft in %s een kaartnaam en een paginanaam", (l) => {
    expect(kaartNaam(slug, l), `sectors.${VOORVOEGSEL[slug]}.title.* ontbreekt in DICT.${l}`,
    ).toBeTruthy();
    expect(paginaNaam(slug, l), `${slug} heeft geen naam voor ${l} in lib/sectors.ts`,
    ).toBeTruthy();
  });

  if (uitzondering) {
    it("wijkt in ELKE taal af, want dat is de reden van de uitzondering", () => {
      const gelijk = LOCALES.filter(
        (l) =>
          naamWoorden(kaartNaam(slug, l) ?? "").join(" ") ===
          naamWoorden(paginaNaam(slug, l) ?? "").join(" "),
      );
      expect(
        gelijk,
        `${slug} staat als bewuste uitzondering genoteerd — ${uitzondering} — maar in ` +
          `${gelijk.join(", ")} zijn kaart en pagina inmiddels gelijk. Dan is de ` +
          "uitzondering niet meer waar: haal hem uit BEWUST_ANDERS.",
      ).toEqual([]);
    });
    return;
  }

  it.each(LOCALES)("noemt zich in %s op de kaart en op de pagina hetzelfde", (l) => {
    const kaart = kaartNaam(slug, l)!;
    const pagina = paginaNaam(slug, l)!;
    expect(
      naamWoorden(pagina),
      `De sectorkaart zegt "${kaart}" en de sectorpagina "${pagina}". Dat zijn twee ` +
        "namen voor één sector, op twee pagina's die naar elkaar linken.",
    ).toEqual(naamWoorden(kaart));
  });
});

/* Het taglabel is de DERDE plek waar een sector zijn naam draagt: het is de H1
 * en de <title> van `/insights/tag/<slug>`. Gemeten op 24 augustus klopt hij in
 * alle twaalf sector-taalcombinaties met het eerste deel van de sectornaam —
 * "Energie" bij "Energie & zon", "Vastgoed" bij "Vastgoed", "Hostelería" bij
 * "Hostelería e ingresos". Dat is dus een echte regel en geen toeval, en zonder
 * assertie kan hij terugvallen zonder dat iets het merkt: het Nederlandse
 * `tag.label.hospitality` stond tot vandaag op "Horeca" terwijl de kaart
 * ernaast al "Hospitality" zei. */
describe("het taglabel draagt dezelfde naam als de sector", () => {
  const MET_LABEL = SECTORS.filter((s) => DICT.en[`tag.label.${s.slug}`] !== undefined);

  it("laat precies één sector zonder taglabel", () => {
    /* `adjacent` is geen artikeltag — er is geen /insights/tag/adjacent. Zonder
       dit aantal zou een verdwenen label de controle stilzwijgend overslaan. */
    const zonder = SECTORS.filter((s) => !MET_LABEL.includes(s)).map((s) => s.slug);
    expect(zonder).toEqual(["adjacent"]);
  });

  it.each(MET_LABEL.map((s) => s.slug))("%s", (slug) => {
    for (const l of LOCALES) {
      const label = DICT[l][`tag.label.${slug}`];
      const naam = paginaNaam(slug, l);
      expect(label, `tag.label.${slug} ontbreekt in DICT.${l}`).toBeTruthy();
      const labelW = naamWoorden(label);
      const naamW = naamWoorden(naam ?? "");
      expect(
        naamW.slice(0, labelW.length),
        `De tagpagina zet "${label}" als kop en de sectorpagina heet "${naam}" (${l}). ` +
          "Dat zijn twee namen voor één sector op twee pagina's die dezelfde lezer bedienen.",
      ).toEqual(labelW);
    }
  });
});
