import { describe, it, expect } from "vitest";
import { getAllInsights, type Insight, type InsightBlock } from "@/lib/insights";
import { DICT } from "./dict";
import { SECTORS } from "../sectors";
import { VENTURES } from "../ventures";
import { SIGNALS } from "../signals";
import { faqStrings } from "../seo/faqs";

/* Twee poorten op de Nederlandse kopij.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Op 2026-08-23 stonden er negentien Nederlandse artikelen. Vijftien
 * spraken de lezer met "je" aan, vier met "u" — en die vier waren allemaal in
 * twee dagen tijd geschreven, door mij, in #232 en #235. `DICT.nl` is "je"
 * (87× je, nul "u") en de sectorpagina's ook, dus "u" was de uitzondering en
 * niet de norm. Een lezer die binnen het energiecluster doorklikte werd
 * halverwege anders aangesproken.
 *
 * Dit is dezelfde vorm als `duits.test.ts`, dat du-vormen in een Sie-corpus
 * tegenhoudt. Zelfde redenering: een test kan niet zien of Nederlands klópt,
 * maar de aanspreekvorm is mechanisch en dus bewaakbaar.
 *
 * De tweede poort komt uit dezelfde reparatie. Bij het omzetten bleek dat ik
 * in diezelfde vier artikelen ook diakrieten had weggelaten — "commerciele",
 * "drieen", "discussieren", "contra-intuitief". Dat is geen stijlkwestie: het
 * zijn niet-bestaande woorden, en ze stonden in gepubliceerde kopij.
 *
 * VERBREED OP 2026-08-24. Tot die dag las dit bestand alleen
 * `getAllInsights("nl")` — 1001 Nederlandse strings in dict, sectors, ventures
 * en signals stonden in geen enkele poort. Dat is dezelfde klasse als
 * `lib/signals.ts`, dat om precies die reden door geen taalpoort werd gelezen.
 * Bij het verbreden bleek er nul te repareren, maar er kwamen wel twee VALSE
 * treffers boven: `pricing.feat.support.*` zegt "24u responstijd" en "4u
 * tijdens werkuren", en dat is de afkorting voor uur. De splitter zag cijfers
 * als scheidingsteken, dus "24u" werd "24" plus "u" — het voornaamwoord.
 * Cijfers horen daarom bij het woord; zie de splitser hieronder.
 *
 * De poorten lezen de geëxporteerde data en niet de bestandstekst, zodat dit
 * bestand zichzelf niet kan laten struikelen over de vormen die het beschrijft. */

type Herkomst = [sleutel: string, waarde: string];

/** Alle zichtbare kopij van één artikel. Bewust ZONDER de slug: die is een
 *  URL en geen proza. Twee slugs dragen "u"/"uw" ("…-die-u-niet-ziet",
 *  "…-controleert-uw-cijfers-…") omdat ze al gepubliceerd waren toen de
 *  aanspreekvorm werd rechtgezet; een URL veranderen kost een 404 en er is
 *  in deze repo geen redirect-laag om hem op te vangen. */
function kopij(p: Insight): string {
  const uitBlok = (b: InsightBlock): string[] => {
    switch (b.type) {
      case "ul":
        return b.items;
      case "quote":
        return [b.text, b.cite ?? ""];
      default:
        return [b.text];
    }
  };
  return [
    p.title,
    p.summary,
    p.seo?.metaTitle ?? "",
    p.seo?.metaDescription ?? "",
    ...p.body.flatMap(uitBlok),
  ].join(" \n ");
}

/** Platslaan tot losse strings, met het veldpad als sleutel. */
function plat(o: unknown, pad: string): Herkomst[] {
  if (typeof o === "string") return [[pad, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => plat(v, `${pad}[${i}]`));
  if (o && typeof o === "object")
    return Object.entries(o).flatMap(([k, v]) => plat(v, `${pad}.${k}`));
  return [];
}

/** Splitst op alles wat geen letter of cijfer is. Regex-literal, geen opgebouwde
 *  string: die laatste gaat door string-escaping heen, en dat is precies hoe een
 *  woordgrens-patroon hier eerder in een backspace-teken veranderde.
 *
 *  Cijfers zitten in de klasse omdat ze ANDERS scheiden: zonder hen valt "24u"
 *  uiteen in "24" en "u", en dan meldt deze poort het voornaamwoord op een
 *  afkorting voor uur. Twee prijsregels deden dat. */
function woorden(zin: string): string[] {
  return zin
    .replace(/<[^>]*>/g, " ")
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9]+/)
    .filter(Boolean);
}

const U_VORMEN = ["u", "uw"];

/* ASCII-vormen van woorden die een trema of accent dragen. Bewust kort en
 * bewust alleen wat hier écht in gepubliceerde kopij heeft gestaan; een lange
 * lijst gaat vals alarm slaan en wordt dan uitgezet. */
const ZONDER_TEKEN: Record<string, string> = {
  commerciele: "commerciële",
  drieen: "drieën",
  discussieren: "discussiëren",
  intuitief: "intuïtief",
  financiele: "financiële",
  industriele: "industriële",
  geinstalleerd: "geïnstalleerd",
  ideeen: "ideeën",
  efficient: "efficiënt",
};

/* (bestand, strings, minimaal aantal strings, minimaal aantal met "je").
 * Twee ondergrenzen per bron, geen gedeelde: een bron die naar bijna nul zakt
 * zou anders meeliften op de omvang van de rest, en een bron die per ongeluk
 * Engels serveert zou langs de eerste grens komen. */
const BRONNEN: Array<
  [bestand: string, strings: Herkomst[], minimaal: number, minimaalJe: number]
> = [
  ["lib/insights.ts", getAllInsights("nl").map((p) => [p.slug, kopij(p)]), 15, 10],
  ["lib/i18n/dict.ts", Object.entries(DICT.nl), 600, 20],
  ["lib/sectors.ts", SECTORS.flatMap((s) => plat(s.i18n?.nl ?? {}, s.slug)), 100, 3],
  ["lib/ventures.ts", VENTURES.flatMap((v) => plat(v.i18n?.nl ?? {}, v.slug)), 90, 3],
  ["lib/signals.ts", SIGNALS.flatMap((s) => plat(s.i18n?.nl ?? {}, s.slug)), 40, 3],
  ["lib/seo/faqs.ts", faqStrings("nl"), 50, 10],
];

describe("de splitser zelf", () => {
  /* De meetlat vóór de meting. Een lege overtreedslijst uit een kapotte
     splitser leest identiek aan een schone meting, dus beide richtingen. */
  it("herkent de vormen waar hij op zoekt", () => {
    for (const v of U_VORMEN) {
      expect(
        woorden(`zolang ${v} dat doet`),
        `"${v}" wordt niet als los woord herkend`,
      ).toContain(v);
    }
    for (const ascii of Object.keys(ZONDER_TEKEN)) {
      expect(woorden(`een ${ascii} geval`), `"${ascii}" overleeft de splitser niet`).toContain(
        ascii,
      );
    }
  });

  it("slaat niet aan op letters binnen een woord", () => {
    for (const zin of ["uur", "duur", "nu", "uitvoering", "uwe wijsheid"]) {
      expect(
        woorden(zin).some((x) => U_VORMEN.includes(x)),
        `valse treffer op "${zin}"`,
      ).toBe(false);
    }
  });

  it("houdt een cijfer aan zijn afkorting vast", () => {
    /* "24u" is uur, niet het voornaamwoord. Zonder cijfers in de klasse
       meldde deze poort twee prijsregels als aanspreekvorm. */
    expect(woorden("E-mail-support (24u responstijd)")).toContain("24u");
    expect(woorden("E-mail-support (24u responstijd)")).not.toContain("u");
    expect(woorden("Priority e-mail (4u tijdens werkuren)")).not.toContain("u");
  });
});

describe.each(BRONNEN)(
  "de Nederlandse kopij in %s",
  (_bestand, strings, minimaal, minimaalJe) => {
    /* Zonder deze zou alles hieronder slagen op een lege of Engelse bron —
       precies de fout uit feedback_assert_niet_door_het_vangnet. */
    it("wordt daadwerkelijk gelezen, en is Nederlands", () => {
      expect(strings.length).toBeGreaterThanOrEqual(minimaal);
      const metJe = strings.filter(([, v]) => woorden(v).includes("je"));
      expect(
        metJe.length,
        "bijna geen enkele string gebruikt 'je'; leest deze test wel Nederlands?",
      ).toBeGreaterThanOrEqual(minimaalJe);
    });

    it("spreekt de lezer nergens met u aan", () => {
      const gevonden = strings
        .filter(([, v]) => woorden(v).some((w) => U_VORMEN.includes(w)))
        .map(([k, v]) => `${k} → "${v.slice(0, 70)}"`);

      expect(
        gevonden,
        "De Nederlandse site is 'je' — het woordenboek, de sectorpagina's en " +
          "vijftien van de negentien artikelen. Een 'u'-string ertussen leest " +
          "als een tweede schrijver, en binnen één cluster wisselt de lezer " +
          "dan halverwege van aanspreekvorm. Wil je hier bewust van afwijken, " +
          "zet dan een uitzondering met reden neer in plaats van de regel te " +
          "verzachten.",
      ).toEqual([]);
    });

    it("schrijft trema's en accenten voluit", () => {
      const gevonden: string[] = [];
      for (const [k, v] of strings) {
        const w = woorden(v);
        for (const [ascii, juist] of Object.entries(ZONDER_TEKEN)) {
          if (w.includes(ascii)) gevonden.push(`${k} → "${ascii}" moet "${juist}" zijn`);
        }
      }
      expect(gevonden, "Dit zijn geen stijlvarianten maar niet-bestaande woorden.").toEqual([]);
    });
  },
);

describe("de Nederlandse poort leest elke kopijbron", () => {
  /* Zonder deze lijst kan een bron stil verdwijnen: de tests hierboven draaien
   * dan door over wat er nog wél in staat en de dekking krimpt zonder dat iets
   * rood wordt. Dit bestand las tot 24 augustus alléén lib/insights.ts, en dat
   * was op precies deze manier onzichtbaar. */
  it("dekt precies de zes bestanden die Nederlandse kopij dragen", () => {
    expect(BRONNEN.map(([bestand]) => bestand)).toEqual([
      "lib/insights.ts",
      "lib/i18n/dict.ts",
      "lib/sectors.ts",
      "lib/ventures.ts",
      "lib/signals.ts",
      "lib/seo/faqs.ts",
    ]);
  });
});
