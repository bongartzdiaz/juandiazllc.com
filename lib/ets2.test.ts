import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "@/lib/insights";
import { kopij, ctaHrefs } from "@/lib/insight-kopij";

/**
 * De ETS2-poort.
 *
 * `docs/claims.md` legt onder "ETS2 en gebouwgas" vast wat er over ETS2 wel en
 * niet geschreven mag worden, en die sectie is er expliciet omdat de claim
 * eerder sterker was opgeschreven dan hij is. Deze poort maakt daar het
 * mechanische deel van af.
 *
 * De jaartallen worden UIT `docs/claims.md` GEPARSEERD en niet overgeschreven.
 * Een tweede kopie van hetzelfde getal is precies waarvoor dat bestand bestaat.
 *
 * Het cluster wordt uit de INHOUD afgeleid en niet uit een tag. Gemeten op
 * 2026-09-01 kruist het de tag-grens: twee artikelen dragen `Logistics` en een
 * derde (`ets2-de-gasrekening-krijgt-een-component-erbij`) draagt `Real estate`.
 * Een filter op tag had dat derde artikel stilzwijgend ongedekt gelaten.
 *
 * Wat deze poort NIET bewaakt: of de NEa-bron zelf nog hetzelfde zegt. Dat is
 * een handmatige verificatie bij de uitvoerder, en de datum daarvan staat in
 * `docs/claims.md`. Een groen vinkje hier betekent "de kopij is consistent met
 * wat er op 2026-08-23 gemeten is", niet "de regelgeving is ongewijzigd".
 */

const WORTEL = join(__dirname, "..");
const CLAIMS = readFileSync(join(WORTEL, "docs/claims.md"), "utf8");

/* ── de bron ──────────────────────────────────────────────────────────── */

function rijUitClaims(patroon: RegExp, wat: string): RegExpMatchArray {
  const treffers = [...CLAIMS.matchAll(new RegExp(patroon, "g"))];
  if (treffers.length !== 1) {
    throw new Error(
      `docs/claims.md draagt ${treffers.length} rijen voor "${wat}", verwacht 1. ` +
        `De ETS2-sectie is herschreven of verdwenen — werk deze poort bij ` +
        `nadat je de claim opnieuw bij de NEa hebt nagemeten.`,
    );
  }
  return treffers[0];
}

const START = Number(
  rijUitClaims(
    /\| Brandstofleveranciers vallen onder ETS2 \| vanaf \*\*(\d{4})\*\*/,
    "start",
  )[1],
);
const VEILING_MAAND = rijUitClaims(
  /\| Eerste veiling van rechten \| ([a-z]+) (\d{4}), \*\*gepland\*\*/,
  "veiling",
);
const VEILING = { maand: VEILING_MAAND[1], jaar: Number(VEILING_MAAND[2]) };
const INLEVERING_RIJ = rijUitClaims(
  /\| Eerste inlevering van rechten \| \*\*(\d{4}), over de emissies van (\d{4})\*\*/,
  "inlevering",
);
const INLEVERING = Number(INLEVERING_RIJ[1]);
const EMISSIEJAAR = Number(INLEVERING_RIJ[2]);

/* ── het cluster ──────────────────────────────────────────────────────── */

const IS_ETS2 = /\bETS2\b|EU ETS-2/i;
const ALLE = getAllInsights("nl");
const CLUSTER = ALLE.filter((p) => IS_ETS2.test(kopij(p)));
const SLUGS = new Set(ALLE.map((p) => p.slug));
const IN_CLUSTER = new Map(CLUSTER.map((p) => [p.slug, p]));

const zinnen = (t: string) => t.split(/(?<=[.!?:])\s+|\n/);
const slugVanHref = (h: string) => h.replace("/insights/", "");
const jarenIn = (z: string): string[] => z.match(/\b20\d{2}\b/g) ?? [];

/**
 * Ontkennend of relativerend. Een verboden formulering mag staan zolang de zin
 * hem ontkent — zo kan een artikel uitleggen waarom een eurotabel onzin is
 * zonder zelf zo'n tabel te worden. Zelfde vorm als in `lib/wpm.test.ts`.
 */
const ONTKENNING =
  /\b(geen|niet|nooit|zonder|aanname|prognose|extrapoleert|bestaat)\b/i;

const EURO = /€\s?[\d.,]*\d|\b\d+([.,]\d+)?\s?(euro|cent)\b/i;
const PER_EENHEID = /per\s+(liter|kubieke meter|m3|m³|kWh)/i;
const DOORBEREKENING = /doorbereken|verwerk\w* de kosten|in (zijn|het|hun) tarief/i;
const COMMERCIEEL =
  /commercieel|commerciële|geen wettelijke|niet vastgelegd|geen verplichting|geen regel/i;
const AFREKENEN = /\binlevering\b|\binleveren\b|afgerekend|afrekening|afrekenen/i;

/* ── de poort ─────────────────────────────────────────────────────────── */

describe("ETS2-kopij volgt docs/claims.md", () => {
  it("leest de jaartallen werkelijk uit docs/claims.md", () => {
    // Zonder deze zelftest slaagt alles hieronder ook op een parser die niets
    // vindt en stil op NaN uitkomt.
    expect(START).toBe(2027);
    expect(VEILING).toEqual({ maand: "januari", jaar: 2027 });
    expect(INLEVERING).toBe(2029);
    expect(EMISSIEJAAR).toBe(2028);
    expect(INLEVERING - VEILING.jaar).toBeGreaterThanOrEqual(2);
  });

  it("vindt het cluster, en het kruist de tag-grens", () => {
    // Positieve controle: nul afwijkingen hieronder is pas een meting nadat
    // vaststaat dat er iets te meten viel.
    expect(CLUSTER.length).toBeGreaterThanOrEqual(3);
    const tags = new Set(CLUSTER.map((p) => p.tag));
    expect(
      tags.size,
      "het cluster is naar een enkele tag gekrompen — controleer of een " +
        "artikel is hernoemd of van tag gewisseld",
    ).toBeGreaterThanOrEqual(2);
  });

  it("noemt nergens een bedrag", () => {
    // claims.md: "Kosten per m3 of per kWh | bestaat niet | geen veilingprijs,
    // geen doorberekeningsregel."
    const fout: string[] = [];
    for (const p of CLUSTER) {
      const t = kopij(p).match(EURO);
      if (t) fout.push(`${p.slug}: ${t[0]}`);
    }
    expect(fout, "een bedrag in ETS2-kopij is per definitie geextrapoleerd").toEqual([]);
    // De detector moet aantoonbaar kunnen vinden.
    expect(EURO.test("dat kost € 12,50 per rit")).toBe(true);
    expect(EURO.test("dat kost 8 cent")).toBe(true);
    expect(EURO.test("de richting is omhoog")).toBe(false);
  });

  it("noemt geen dag bij de geplande veilingmaand", () => {
    // De veiling is een voornemen. Een dagnummer ervoor maakt er een
    // vastgelegde datum van, en dat is exact wat claims.md verbiedt.
    const dag = new RegExp(`\\d{1,2}\\s+${VEILING.maand}\\s+${VEILING.jaar}`, "i");
    const fout = CLUSTER.filter((p) => dag.test(kopij(p))).map((p) => p.slug);
    expect(fout).toEqual([]);
    expect(dag.test(`1 ${VEILING.maand} ${VEILING.jaar}`)).toBe(true);
    expect(dag.test(`${VEILING.maand} ${VEILING.jaar}`)).toBe(false);
  });

  it("zet 'gepland' bij de veiling zodra er een jaartal bij staat", () => {
    // Nauw gescopet, en dat is gemeten: een bredere regel valt over
    // "veilingprijs" en over zinnen die de veiling alleen aanhalen. De
    // kwalificatie hoort bij de zin die het MOMENT stelt.
    const fout: string[] = [];
    for (const p of CLUSTER) {
      for (const z of zinnen(kopij(p))) {
        if (!/\bveiling(en)?\b/i.test(z)) continue;
        if (!/\b20\d{2}\b/.test(z)) continue;
        if (/gepland|voornemen/i.test(z)) continue;
        fout.push(`${p.slug}: ${z.slice(0, 90)}`);
      }
    }
    expect(fout).toEqual([]);
  });

  it("merkt doorberekening als commercieel gedrag, niet als plicht", () => {
    // Artikelniveau en niet zinsniveau, en dat is gemeten: de kopij zet het
    // feit in de ene zin en de kwalificatie in de volgende. Een zin-gescopete
    // regel keurde alle drie de bestaande artikelen af.
    const fout: string[] = [];
    for (const p of CLUSTER) {
      const k = kopij(p);
      if (!DOORBEREKENING.test(k)) continue;
      if (COMMERCIEEL.test(k)) continue;
      fout.push(p.slug);
    }
    expect(
      fout,
      "claims.md: doorberekening is commercieel gedrag, geen wettelijke verplichting",
    ).toEqual([]);
  });

  it("noemt een prijs per eenheid alleen ontkennend", () => {
    const fout: string[] = [];
    for (const p of CLUSTER) {
      for (const z of zinnen(kopij(p))) {
        if (!PER_EENHEID.test(z)) continue;
        if (ONTKENNING.test(z)) continue;
        fout.push(`${p.slug}: ${z.slice(0, 90)}`);
      }
    }
    expect(fout).toEqual([]);
    expect(PER_EENHEID.test("een tabel per kubieke meter")).toBe(true);
    expect(ONTKENNING.test("een tabel per kubieke meter")).toBe(false);
  });

  it("noemt bij het afrekenen altijd het jaar dat claims.md vastlegt", () => {
    // Positief geformuleerd, en dat is een correctie op een eerdere versie.
    // Die verbood elk niet-toegestaan jaartal in dezelfde zin, en viel daarmee
    // over de samenvattingszin "Vanaf 2027 ... en er wordt pas in 2029
    // afgerekend, over de emissies van 2028" — waar 2027 de startdatum is en
    // niet de afrekening. Wat werkelijk fout is, is een afrekenzin die een
    // jaartal noemt zonder het inleverjaar te noemen.
    //
    // Bekende grens: "in 2027 wordt afgerekend, twee jaar voor 2029" komt hier
    // langs. Geconstrueerd, en de prijs van een regel die niet vals afgaat.
    const fout: string[] = [];
    for (const p of CLUSTER) {
      for (const z of zinnen(kopij(p))) {
        if (!AFREKENEN.test(z)) continue;
        const jaren = jarenIn(z);
        if (jaren.length === 0) continue;
        if (jaren.includes(String(INLEVERING))) continue;
        fout.push(`${p.slug}: ${z.slice(0, 90)}`);
      }
    }
    expect(
      fout,
      `de eerste inlevering is ${INLEVERING} — een afrekenzin met een jaartal ` +
        `dat ${INLEVERING} niet noemt, leest als een vervroegde deadline`,
    ).toEqual([]);

    // De regel moet aantoonbaar afgaan op precies dat.
    const proef = (z: string) =>
      AFREKENEN.test(z) &&
      jarenIn(z).length > 0 &&
      !jarenIn(z).includes(String(INLEVERING));
    expect(proef("De eerste inlevering vindt plaats in 2027.")).toBe(true);
    expect(proef("Er wordt pas in 2029 afgerekend, over 2028.")).toBe(false);
    expect(proef("Het moment van afrekenen ligt verder weg.")).toBe(false);
  });

  it("draagt in elk artikel de kop 'Wat ik hier niet beweer'", () => {
    // Kalenderregel: verplicht bij elke regelgevingshaak.
    const fout = CLUSTER.filter(
      (p) =>
        !p.body.some(
          (b) => b.type === "h2" && /Wat ik hier niet beweer/i.test(b.text),
        ),
    ).map((p) => p.slug);
    expect(fout).toEqual([]);
  });

  it("laat elke cta op een bestaand artikel uitkomen", () => {
    const dood: string[] = [];
    for (const p of CLUSTER) {
      for (const h of ctaHrefs(p)) {
        if (!SLUGS.has(slugVanHref(h))) dood.push(`${p.slug} -> ${h}`);
      }
    }
    expect(dood).toEqual([]);
  });

  it("houdt elke link binnen het cluster wederkerig", () => {
    // De kalenderregel eist een kruislink in BEIDE richtingen. Bewust gescopet
    // op links die er zijn: `ets2-de-gasrekening-krijgt-een-component-erbij`
    // draagt vandaag nul cta's, en dat is een bestaand gat dat hier niet
    // stilzwijgend gerepareerd hoort te worden.
    const eenrichting: string[] = [];
    for (const p of CLUSTER) {
      for (const h of ctaHrefs(p)) {
        const doel = IN_CLUSTER.get(slugVanHref(h));
        if (!doel) continue;
        const terug = ctaHrefs(doel).some((x) => slugVanHref(x) === p.slug);
        if (!terug) eenrichting.push(`${p.slug} -> ${doel.slug}`);
      }
    }
    expect(eenrichting).toEqual([]);
  });

  it("bewaart de regel die zegt wat er bruikbaar is", () => {
    const plat = CLAIMS.replace(/\s+/g, " ");
    expect(
      plat,
      "de slotregel van de ETS2-sectie is de reden dat deze poort bestaat",
    ).toContain(
      "de verplichting ligt bij de leverancier, de kosten komen via het tarief binnen",
    );
  });
});
