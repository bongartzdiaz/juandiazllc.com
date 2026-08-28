import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "@/lib/insights";

// docs/linkedin-posts.md is de wachtrij: twaalf posts die Juan met de hand op
// LinkedIn plakt. Deze poort bewaakt de drie dingen die aan die tekst kunnen
// rotten zonder dat iemand het merkt.
//
// 1. EEN DODE LINK. Elke post eindigt op een artikel-URL. Hernoemt iemand een
//    slug in lib/insights.ts, dan wijst een geplaatste post naar een 404 — en
//    dat zie je pas nadat een lezer geklikt heeft, dus nooit. Op 2026-08-28
//    zijn alle twaalf met de hand op productie gemeten (200, met een
//    niet-bestaande slug als negatieve controle die 404 gaf). Dat doet niemand
//    een tweede keer; deze poort doet het bij elke run.
//
// 2. EEN BEDRAG. De posts dragen bewust geen enkel bedrag: cijfers komen uit
//    docs/claims.md en staan in de Over-tekst van het profiel, niet in kopij
//    die langs geen enkele controle loopt.
//
// 3. EEN TWEEDE KOPIE. Tot vandaag stonden de eerste zes posts ook in
//    docs/social-linkedin.md. Twee documenten die een tekst dragen lopen uit
//    elkaar, en dan bewaakt de zwakste. De wachtrij is nu de enige plek.
//
// Wat deze poort NIET kan: zien of een post waar is, of hij bij zijn artikel
// past, of hij goed Nederlands is. Daar is lezen voor. Een groen vinkje hier
// betekent niet "de posts kloppen".

const WORTEL = join(__dirname, "..");
const WACHTRIJ = join(WORTEL, "docs", "linkedin-posts.md");
const WAAROM = join(WORTEL, "docs", "social-linkedin.md");

/** LinkedIn kapt een bericht af boven dit aantal tekens. */
const LIMIET = 3000;
const VERWACHT_AANTAL = 12;

const EURO = String.fromCharCode(0x20ac);

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** De posts staan elk in een fenced blok. Alles daarbuiten is toelichting. */
function posts(md: string): string[] {
  return [...md.matchAll(/\n```\n([\s\S]*?)\n```\n/g)].map((m) => m[1]);
}

function slugsIn(tekst: string): string[] {
  return [...tekst.matchAll(/juandiazllc\.com\/nl\/insights\/([a-z0-9-]+)/g)].map(
    (m) => m[1],
  );
}

const WACHTRIJ_MD = lees(WACHTRIJ);
const POSTS = posts(WACHTRIJ_MD);
const NL_SLUGS = new Set(getAllInsights("nl").map((p) => p.slug));

describe("de LinkedIn-wachtrij", () => {
  // Deze twee zijn de positieve controles. Zonder hen slaagt elke assertie
  // hieronder ook op een lege lijst — een kapotte extractie leest dan precies
  // hetzelfde als een schone meting.
  it("levert twaalf posts op", () => {
    expect(POSTS).toHaveLength(VERWACHT_AANTAL);
  });

  it("kent de Nederlandse artikelen", () => {
    expect(NL_SLUGS.size).toBeGreaterThan(15);
    expect(NL_SLUGS.has("verzonnen-slug-die-niet-bestaat")).toBe(false);
  });

  it("laat elke post naar een artikel wijzen dat in de NL-markt staat", () => {
    const dood = POSTS.flatMap((p, i) =>
      slugsIn(p)
        .filter((s) => !NL_SLUGS.has(s))
        .map((s) => `post ${i + 1}: ${s}`),
    );
    expect(dood).toEqual([]);
  });

  it("geeft elke post precies een link, als laatste regel", () => {
    const fout: string[] = [];
    POSTS.forEach((p, i) => {
      const gevonden = slugsIn(p);
      if (gevonden.length !== 1) {
        fout.push(`post ${i + 1}: ${gevonden.length} links, verwacht 1`);
        return;
      }
      // "De link onderaan, kaal" is regel 3 van de vorm. Een link middenin
      // leest als een voetnoot en wordt niet aangeklikt.
      const laatste = p.trimEnd().split("\n").pop()!.trim();
      if (!laatste.endsWith(gevonden[0])) {
        fout.push(`post ${i + 1}: link staat niet op de laatste regel`);
      }
    });
    expect(fout).toEqual([]);
  });

  it("houdt elke post binnen de tekenlimiet van LinkedIn", () => {
    const telang = POSTS.map((p, i) => ({ n: i + 1, len: p.length }))
      .filter((x) => x.len > LIMIET)
      .map((x) => `post ${x.n}: ${x.len}`);
    expect(telang).toEqual([]);
  });

  it("noemt in de kop de werkelijk langste post", () => {
    // Dit getal is bij het schrijven een keer verzonnen en stond er 85 tekens
    // naast. Vandaar een assertie in plaats van vertrouwen.
    const m = WACHTRIJ_MD.match(/langste post \| ([\d.]+) tekens/);
    expect(m, "de kop noemt de langste post niet meer").not.toBeNull();
    const beweerd = Number(m![1].replace(/\./g, ""));
    const gemeten = Math.max(...POSTS.map((p) => p.length));
    expect(beweerd).toBe(gemeten);
  });

  it("draagt geen bedrag in een post", () => {
    // Positieve controle eerst: de detector moet aantoonbaar iets kunnen
    // vinden, anders bewijst een lege lijst niets.
    const bedrag = (t: string) =>
      t.includes(EURO) || /\bEUR\b/.test(t) || /\b\d+\s?euro\b/i.test(t);
    expect(bedrag(`de sprint kost ${EURO}2.500`)).toBe(true);
    expect(bedrag("de sprint duurt 30 dagen")).toBe(false);

    const met = POSTS.map((p, i) => (bedrag(p) ? `post ${i + 1}` : ""))
      .filter(Boolean);
    expect(met).toEqual([]);
  });

  it("staat maar op een plek", () => {
    expect(slugsIn(lees(WAAROM))).toEqual([]);
  });
});
