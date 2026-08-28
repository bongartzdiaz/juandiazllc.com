import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "@/lib/insights";
import { DICT } from "@/lib/i18n/dict";

// docs/kanalen.md zegt welke kanalen nu aan de beurt zijn en waarom de rest
// wacht. Het draagt daarvoor cijfers die het NIET zelf bezit: artikelaantallen,
// de capaciteitsgrens, de sprintprijs, de vier klantuitkomsten en het aantal
// posts in de wachtrij. Elk van die vijf woont ergens anders, en elk kan daar
// veranderen zonder dat dit document meebeweegt.
//
// Dat is de vaakst terugkerende bugklasse in deze repo: een document beschrijft
// een toestand die niet meer bestaat. Twee keer eerder is precies dit misgegaan
// met een artikelaantal — docs/bereik-plan.md telde elf energie-artikelen waar
// er vijf staan, omdat het de DE- en ES-clusters meetelde voor een Nederlandse
// markt. Bij het schrijven van dit document is diezelfde fout opnieuw gemaakt
// en pas bij het nameten gevonden. Vandaar een poort in plaats van vertrouwen.
//
// Wat deze poort NIET kan zien: of §1 nog klopt. De 402, de ontbrekende
// Plausible-doelen en de niet-gezette secrets zijn metingen van buitenaf, met
// een datum erbij. Een groen vinkje hier betekent niet "de stand klopt" — draai
// scripts/probe-supabase-402.sh voordat je §1 als actueel leest.

const WORTEL = join(__dirname, "..");
const KANALEN = join(WORTEL, "docs", "kanalen.md");
const CLAIMS = join(WORTEL, "docs", "claims.md");
const POSTS = join(WORTEL, "docs", "linkedin-posts.md");

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** Telwoorden die dit document gebruikt. Bewust een korte lijst: een getal dat
    hier niet in staat hoort als cijfer geschreven te worden, niet als woord. */
const WOORD: Record<string, number> = {
  vier: 4,
  vijf: 5,
  twaalf: 12,
  zevenentwintig: 27,
  drie: 3,
};

const DOC = lees(KANALEN);

/** Zelfde tekst met alle witruimte platgeslagen. De zinnen hieronder lopen
    over regeleinden, en een patroon dat een regeleinde veronderstelt breekt
    zodra iemand de alinea anders afbreekt -- dat is geen defect, maar het
    leest wel als een. */
const PLAT = DOC.replace(/\s+/g, " ");

/** Het bedrag uit de prijsrij van docs/claims.md. Geparst, niet overgeschreven:
    een tweede kopie van hetzelfde getal is precies waarvoor claims.md bestaat. */
function prijsUitClaims(): string {
  const m = lees(CLAIMS).match(/\|\s*vaste prijs sprint\s*\|\s*\*\*([^*]+)\*\*/);
  if (!m) {
    throw new Error(
      "docs/claims.md draagt geen rij `vaste prijs sprint`. Zet hem terug of " +
        "werk deze poort bij — een prijs zonder bron mag nergens in kopij staan.",
    );
  }
  return m[1].trim();
}

/** De capaciteitsgrens uit dezelfde bron. */
function capaciteitUitClaims(): number {
  const alle = [
    ...lees(CLAIMS).matchAll(/\|\s*trajecten tegelijk\s*\|\s*\*\*([^*]+)\*\*/g),
  ];
  if (alle.length !== 1) {
    throw new Error(
      `docs/claims.md draagt ${alle.length} rijen \`trajecten tegelijk\`, verwacht 1. ` +
        "Bij meer dan een leest deze poort er stil de eerste, en dat is hoe een " +
        "afwijkend tweede getal onzichtbaar blijft.",
    );
  }
  const w = alle[0][1].trim().toLowerCase();
  const n = WOORD[w];
  if (n === undefined) throw new Error(`onbekend telwoord in claims.md: ${w}`);
  return n;
}

describe("docs/kanalen.md", () => {
  // Positieve controles. Zonder deze twee slaagt elke assertie hieronder ook op
  // een leeg document of een lege artikellijst -- een kapotte lezer leest dan
  // precies hetzelfde als een schone meting.
  it("leest het document", () => {
    expect(DOC.length).toBeGreaterThan(3000);
    expect(DOC).toContain("## §1");
    expect(DOC).toContain("## §5");
  });

  it("kent de Nederlandse artikelen", () => {
    const slugs = new Set(getAllInsights("nl").map((p) => p.slug));
    expect(slugs.size).toBeGreaterThan(15);
    expect(slugs.has("verzonnen-slug-die-niet-bestaat")).toBe(false);
  });

  it("noemt het werkelijke aantal NL energie-artikelen", () => {
    // De val: elf is het totaal over nl+de+es. Een Nederlandse introductie komt
    // binnen op de NL-markt, en daar staan er vijf.
    const gemeten = getAllInsights("nl").filter((p) => p.tag === "Energy").length;
    const m = PLAT.match(/markt waar (\w+) artikelen/);
    expect(m, "de zin over de energiemarkt is weg of herschreven").not.toBeNull();
    expect(WOORD[m![1]]).toBe(gemeten);
  });

  it("noemt het werkelijke aantal artikelen over alle markten", () => {
    const uniek = new Set(
      (["en", "nl", "de", "es"] as const).flatMap((l) =>
        getAllInsights(l).map((p) => p.slug),
      ),
    );
    const m = PLAT.match(/(\w+) meningsartikelen/);
    expect(m, "de zin over meningsartikelen is weg of herschreven").not.toBeNull();
    expect(WOORD[m![1].toLowerCase()]).toBe(uniek.size);
  });

  it("noemt de capaciteitsgrens die docs/claims.md vastlegt", () => {
    const m = PLAT.match(/\*\*(\w+) trajecten tegelijk\.\*\*/);
    expect(m, "de capaciteitszin is weg of herschreven").not.toBeNull();
    expect(WOORD[m![1].toLowerCase()]).toBe(capaciteitUitClaims());
  });

  it("draagt geen ander bedrag dan de prijs uit docs/claims.md", () => {
    const prijs = prijsUitClaims();
    // Positieve controle: de detector moet aantoonbaar iets kunnen vinden.
    const EURO = String.fromCharCode(0x20ac);
    const bedragen = (t: string) =>
      [...t.matchAll(new RegExp(EURO + "\\d(?:[\\d.,]*\\d)?", "g"))].map((x) => x[0]);
    expect(bedragen(`kost ${EURO}1.234 per maand`)).toEqual([`${EURO}1.234`]);
    expect(bedragen("kost dertig dagen")).toEqual([]);

    const gevonden = bedragen(DOC);
    expect(gevonden.length).toBeGreaterThan(0);
    expect([...new Set(gevonden)]).toEqual([prijs]);
  });

  it("noemt de vier klantuitkomsten zoals dict.ts ze schrijft", () => {
    const sectoren = [1, 2, 3, 4].map(
      (n) => (DICT.nl as Record<string, string>)[`results.r${n}.sector`],
    );
    expect(sectoren.every((s) => typeof s === "string" && s.length > 3)).toBe(true);

    // De sectornamen staan met een kleine letter in de lopende zin; dict.ts
    // schrijft de eerste hoofdletter. Vergelijk daarom kleingemaakt.
    const doc = PLAT.toLowerCase();
    const ontbreekt = sectoren.filter((s) => !doc.includes(s.toLowerCase()));
    expect(ontbreekt).toEqual([]);
  });

  it("noemt het werkelijke aantal posts in de wachtrij", () => {
    const aantal = [...lees(POSTS).matchAll(/\n```\n([\s\S]*?)\n```\n/g)].length;
    expect(aantal).toBeGreaterThan(0);
    const m = PLAT.match(/(\w+) posts in `docs\/linkedin-posts\.md`/);
    expect(m, "de verwijzing naar de wachtrij is weg of herschreven").not.toBeNull();
    expect(WOORD[m![1].toLowerCase()]).toBe(aantal);
  });
});
