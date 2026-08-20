import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { DICT, LOCALES, type Locale } from "./dict";

/* Gate: elke ingang naar een gesprek heet overal hetzelfde.
 *
 * Op 2026-08-20 wees elke knop hieronder naar /contact of naar de cal.com-link,
 * en droeg elk een andere tekst. In het Engels alleen al zes namen: "Book a
 * blueprint call", "Book a call", "Start a conversation", "Work together",
 * "Book the next slot", "Book 15 minutes". Duits had er zeven. Een bezoeker die
 * "Start a conversation" leest weet niet dat dat hetzelfde gratis
 * blueprint-gesprek is waarover /services schrijft.
 *
 * TWEE AFSPRAKEN, TWEE NAMEN — dat is geen uitzondering maar de kern.
 * `lib/seo/faqs.ts` beantwoordt in vier talen de vraag "is de boeking van 15
 * minuten hetzelfde als een blueprint-gesprek?" met: nee. De boekingslink plant
 * een kennismaking van een kwartier; het blueprint-gesprek is de langere sessie
 * van 30 minuten met schriftelijke diagnose, en die wordt pas daarna ingepland.
 * Dus: /contact-knoppen dragen `cta.book`, cal.com-knoppen `cta.intro`. Zet ze
 * niet gelijk — dan spreekt de knop de FAQ tegen die twee schermen lager staat.
 *
 * De reparatie was niet elf sleutels gelijkzetten maar er één van maken. Elf
 * gelijke waarden in vier talen zijn 44 plekken die je met de hand synchroon
 * moet houden, en dat is precies de vorm waarin dit gat is ontstaan — vergelijk
 * de dubbele navigatielijst die om dezelfde reden tot één `NAV_LINKS` is
 * teruggebracht.
 *
 * Deze gate bewaakt twee dingen die een sleutel alléén niet bewaakt: dat er
 * geen twaalfde knop bijkomt met een eigen tekst, en dat zo'n knop zijn tekst
 * niet hardgecodeerd meekrijgt. Dat laatste was geen theorie: de
 * sectordetailpagina had "Book a blueprint call" letterlijk in de JSX staan,
 * dus stond er Engels op /nl, /de en /es. */

const WORTEL = join(__dirname, "..", "..");

/** Links naar /contact die géén aanbodknop zijn, met reden. */
const NIET_HET_AANBOD: Record<string, string> = {
  "nav.contact": "navigatielabel in balk en footer — een routenaam, geen aanbod",
  "now.outro.link.contact": "lopende tekst op /now",
  "uses.outro.link": "lopende tekst op /uses",
  "insights.d.want.cta":
    "tekstlink ónder de boekknop, wijst naar het formulier — beschrijft de route, herhaalt de naam niet",
  "pricing.outro.cta":
    "/pricing verkoopt DEUS, niet het consultancytraject: 14 dagen proberen is een ander aanbod",
};

/** Sleutels die tot 2026-08-20 een eigen naam voor dezelfde stap droegen. */
const OPGEHEVEN = [
  "contact.book.cta",
  "hero.cta.primary",
  "cta.primary",
  "cta.float",
  "about.cta",
  "services.cta.btn",
  "roi.outro.cta",
  "work.d.want.cta",
  "work.d.talk",
  "signals.d.cta",
  "fomo.capacity.cta",
];

function tsxBestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "node_modules") continue;
      uit.push(...tsxBestanden(pad));
    } else if (naam.endsWith(".tsx")) {
      uit.push(pad);
    }
  }
  return uit;
}

const BESTANDEN = [join(WORTEL, "app"), join(WORTEL, "components")]
  .flatMap(tsxBestanden)
  .map((p) => relative(WORTEL, p).split(sep).join("/"))
  .sort();

type Link = { bestand: string; regel: number; sleutel: string | null; naarCal: boolean };

/* Zoekt elke <LocaleLink>/<a> die naar /contact of de boekingslink wijst en
 * leest de eerste vertaalsleutel binnen dat element. Het venster stopt bij de
 * sluittag, zodat een knop zonder sleutel niet stilletjes de sleutel van zijn
 * buurman opraapt — juist die knop is de fout die we zoeken. */
function eersteStapLinks(): Link[] {
  const uit: Link[] = [];
  const href = /href=(?:"\/contact|\{BOOKING_15MIN\})/g;
  const sleutel = /(?:\bt|translate)\(\s*(?:l\s*,\s*)?"([a-z][a-zA-Z0-9._]*)"/;

  for (const bestand of BESTANDEN) {
    const bron = readFileSync(join(WORTEL, bestand), "utf8");
    for (const m of bron.matchAll(href)) {
      const na = bron.slice(m.index! + m[0].length);
      const eindes = [na.indexOf("</LocaleLink>"), na.indexOf("</a>")].filter((i) => i >= 0);
      const venster = na.slice(0, eindes.length ? Math.min(...eindes) : 300);
      uit.push({
        bestand,
        regel: bron.slice(0, m.index!).split("\n").length,
        sleutel: venster.match(sleutel)?.[1] ?? null,
        naarCal: m[0].includes("BOOKING_15MIN"),
      });
    }
  }
  return uit;
}

describe("cta.book en cta.intro — de namen van de twee afspraken", () => {
  it("bestaan allebei in alle vier de woordenboeken", () => {
    for (const l of LOCALES) {
      for (const sleutel of ["cta.book", "cta.intro"]) {
        expect(DICT[l as Locale][sleutel], `${sleutel} ontbreekt in ${l}`).toBeTruthy();
      }
    }
  });

  // translate() valt stil terug op Engels. Een Duitse knop die toevallig de
  // Engelse tekst draagt ziet er dus werkend uit. Assert op DICT, niet erdoorheen.
  it("zijn echt vertaald, niet teruggevallen op Engels", () => {
    for (const sleutel of ["cta.book", "cta.intro"]) {
      for (const l of ["nl", "de", "es"] as Locale[]) {
        expect(DICT[l][sleutel], `${l} draagt de Engelse tekst voor ${sleutel}`).not.toBe(
          DICT.en[sleutel],
        );
      }
    }
  });

  it("blijven uit elkaar te houden", () => {
    // Zodra deze twee dezelfde tekst dragen, spreekt de boekknop de FAQ tegen
    // die twee schermen lager uitlegt dat het kwartier géén blueprint-gesprek
    // is. Dat was de fout die deze gate hier heeft gebracht.
    for (const l of LOCALES) {
      expect(DICT[l as Locale]["cta.intro"]).not.toBe(DICT[l as Locale]["cta.book"]);
    }
  });

  it("noemen de duur alleen bij de kennismaking", () => {
    for (const l of LOCALES) {
      expect(DICT[l as Locale]["cta.book"], "het blueprint-gesprek duurt 30 minuten, niet 15").not.toMatch(/\d/);
      expect(DICT[l as Locale]["cta.intro"], "het kwartier is juist wat deze stap onderscheidt").toMatch(/15/);
    }
  });
});

describe("elke gespreksknop gebruikt de juiste sleutel", () => {
  it("vindt daadwerkelijk links om te controleren", () => {
    // Zonder deze controle zou een kapot pad de gate op een lege lijst laten
    // slagen.
    expect(BESTANDEN.length).toBeGreaterThan(30);
    expect(eersteStapLinks().length).toBeGreaterThan(10);
  });

  it("geeft elke link naar /contact een vertaalsleutel", () => {
    const hardgecodeerd = eersteStapLinks().filter((l) => l.sleutel === null);
    expect(
      hardgecodeerd.map((l) => `${l.bestand}:${l.regel}`),
      "knoptekst staat hardgecodeerd in de JSX en lekt dus Engels naar /nl, /de en /es",
    ).toEqual([]);
  });

  it("laat geen tweede naam voor dezelfde stap toe", () => {
    const afwijkend = eersteStapLinks().filter((l) => {
      if (l.sleutel === null || l.sleutel in NIET_HET_AANBOD) return false;
      return l.sleutel !== (l.naarCal ? "cta.intro" : "cta.book");
    });
    expect(
      afwijkend.map((l) => `${l.bestand}:${l.regel} → ${l.sleutel}`),
      "cal.com-knoppen gebruiken cta.intro, /contact-knoppen cta.book — of zet de sleutel met reden in NIET_HET_AANBOD",
    ).toEqual([]);
  });

  it("dekt beide afspraken", () => {
    // Zonder deze controle zou de gate blijven slagen als iemand alle
    // cal.com-knoppen weghaalt — dan is er niets meer te boeken.
    const links = eersteStapLinks();
    expect(links.some((l) => l.naarCal && l.sleutel === "cta.intro")).toBe(true);
    expect(links.some((l) => !l.naarCal && l.sleutel === "cta.book")).toBe(true);
  });

  it("houdt de opgeheven sleutels opgeheven", () => {
    for (const l of LOCALES) {
      for (const sleutel of OPGEHEVEN) {
        expect(
          DICT[l as Locale][sleutel],
          `${sleutel} is terug in ${l} — dat is opnieuw een tweede naam`,
        ).toBeUndefined();
      }
    }
  });
});
