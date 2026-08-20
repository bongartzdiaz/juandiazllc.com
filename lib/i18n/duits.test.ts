import { describe, it, expect } from "vitest";
import { DICT } from "./dict";

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
    const gevonden = waarden
      .filter(([, v]) => woorden(v).some((w) => DU_VORMEN.includes(w)))
      .map(([k, v]) => `${k} → "${v.slice(0, 70)}"`);

    expect(
      gevonden,
      "De Duitse site is Sie. Een du-vorm ertussen leest als een tweede " +
        "schrijver. Wil je hier bewust van afwijken, zet dan een uitzondering " +
        "met reden neer in plaats van de regel te verzachten.",
    ).toEqual([]);
  });

  it("draagt geen van de woorden die zijn teruggedraaid", () => {
    const gevonden: string[] = [];
    for (const [woord, reden] of Object.entries(NIET_MEER)) {
      const laag = woord.toLowerCase();
      for (const [k, v] of waarden) {
        if (woorden(v).includes(laag)) gevonden.push(`${k} → "${woord}": ${reden}`);
      }
    }
    expect(gevonden, "Zie de reden achter elk woord.").toEqual([]);
  });
});
