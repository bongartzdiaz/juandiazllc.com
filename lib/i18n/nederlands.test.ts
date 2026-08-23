import { describe, it, expect } from "vitest";
import { getAllInsights, type Insight, type InsightBlock } from "@/lib/insights";

/* Twee poorten op de Nederlandse artikelen.
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
 * De poort leest `getAllInsights("nl")` en niet het bestand, zodat dit bestand
 * zichzelf niet kan laten struikelen over de vormen die het beschrijft. */

const NL = getAllInsights("nl");

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

/** Splitst op alles wat geen letter is. Regex-literal, geen opgebouwde string:
 *  die laatste gaat door string-escaping heen, en dat is precies hoe een
 *  woordgrens-patroon hier eerder in een backspace-teken veranderde. */
function woorden(zin: string): string[] {
  return zin
    .replace(/<[^>]*>/g, " ")
    .toLowerCase()
    .split(/[^a-zà-ÿ]+/)
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

describe("de Nederlandse artikelen", () => {
  /* Zonder deze twee zou alles hieronder slagen op een lege of Engelse lijst —
     precies de fout uit feedback_assert_niet_door_het_vangnet. */
  it("leest daadwerkelijk Nederlandse kopij", () => {
    expect(NL.length).toBeGreaterThan(15);
    const metJe = NL.filter((p) => woorden(kopij(p)).includes("je"));
    expect(
      metJe.length,
      "geen enkel artikel gebruikt 'je'; leest deze test wel Nederlands?",
    ).toBeGreaterThan(10);
  });

  /* De meetlat vóór de meting. Een lege overtreedslijst uit een kapotte
     splitser leest identiek aan een schone meting, dus beide richtingen. */
  it("herkent de vormen waar hij op zoekt", () => {
    for (const v of U_VORMEN) {
      expect(woorden(`zolang ${v} dat doet`), `"${v}" wordt niet als los woord herkend`).toContain(v);
    }
    // en slaat niet aan op letters binnen een woord
    for (const zin of ["uur", "duur", "nu", "uitvoering", "uwe-onzin-bestaat-niet"]) {
      const w = woorden(zin);
      if (zin === "uwe-onzin-bestaat-niet") continue;
      expect(w.some((x) => U_VORMEN.includes(x)), `valse treffer op "${zin}"`).toBe(false);
    }
    for (const ascii of Object.keys(ZONDER_TEKEN)) {
      expect(woorden(`een ${ascii} geval`), `"${ascii}" overleeft de splitser niet`).toContain(ascii);
    }
  });

  it("spreekt de lezer nergens met u aan", () => {
    const gevonden = NL.filter((p) =>
      woorden(kopij(p)).some((w) => U_VORMEN.includes(w)),
    ).map((p) => p.slug);

    expect(
      gevonden,
      "De Nederlandse site is 'je' — het woordenboek, de sectorpagina's en " +
        "vijftien van de negentien artikelen. Een 'u'-artikel ertussen leest " +
        "als een tweede schrijver, en binnen één cluster wisselt de lezer " +
        "dan halverwege van aanspreekvorm. Wil je hier bewust van afwijken, " +
        "zet dan een uitzondering met reden neer in plaats van de regel te " +
        "verzachten.",
    ).toEqual([]);
  });

  it("schrijft trema's en accenten voluit", () => {
    const gevonden: string[] = [];
    for (const p of NL) {
      const w = woorden(kopij(p));
      for (const [ascii, juist] of Object.entries(ZONDER_TEKEN)) {
        if (w.includes(ascii)) gevonden.push(`${p.slug} → "${ascii}" moet "${juist}" zijn`);
      }
    }
    expect(
      gevonden,
      "Dit zijn geen stijlvarianten maar niet-bestaande woorden.",
    ).toEqual([]);
  });
});
