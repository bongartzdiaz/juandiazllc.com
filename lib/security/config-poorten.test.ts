import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/* Poort op twee configuratiebestanden die door geen enkele test werden gelezen.

   Aanleiding: `.github/dependabot.yml` en de handtekening-stap in
   `.github/workflows/dependency-audit.yml` zijn allebei verdedigingen die
   stil te verzwakken zijn. De wachttijd van zeven dagen naar nul zetten is
   een cijfer; de handtekening-stap uitzetten is een regel. Geen van beide
   levert een rood vinkje op, want YAML wordt hier door niets gelezen.

   Waarom een tekstscan en geen YAML-parser: `js-yaml` staat hier alleen als
   transitieve afhankelijkheid van eslint, niet in package.json. Een poort die
   daarop leunt valt stil weg bij de eerstvolgende bump — precies het soort
   stille verdwijning dat dit bestand moet voorkomen. De prijs is dat de scan
   de structuur niet begrijpt; de zelftests hieronder pinnen daarom vast dat
   hij vindt wat hij hoort te vinden en niet meer dan dat. */

const WORTEL = join(__dirname, "..", "..");

function lees(pad: string): string {
  return readFileSync(join(WORTEL, pad), "utf8");
}

const DEPENDABOT = ".github/dependabot.yml";
const WORKFLOW = ".github/workflows/dependency-audit.yml";

/** De afgesproken wachttijd. Zeven dagen dekt elke gedocumenteerde npm-kaping
 *  van het afgelopen jaar; GitHub's eigen standaard staat op drie. Omlaag
 *  bijstellen mag, maar niet stilzwijgend. */
const MINIMALE_WACHTTIJD_DAGEN = 7;

/** Regels zonder commentaar. `#` binnen een YAML-waarde komt in deze twee
 *  bestanden niet voor; zou dat veranderen, dan is dat hier te zien. */
function zonderCommentaar(inhoud: string): string[] {
  return inhoud
    .split(/\r?\n/)
    .map((r) => r.replace(/#.*$/, ""))
    .filter((r) => r.trim() !== "");
}

/** Het aantal dagen achter `default-days:`. Gooit als de sleutel ontbreekt of
 *  meer dan eens voorkomt — twee waarden voor één feit is precies de vorm
 *  waarin een poort de verkeerde leest. */
function wachttijd(inhoud: string): number {
  const treffers = zonderCommentaar(inhoud)
    .map((r) => /^\s*default-days:\s*(\d+)\s*$/.exec(r))
    .filter((m): m is RegExpExecArray => m !== null);

  if (treffers.length !== 1) {
    throw new Error(
      `verwachtte precies een regel 'default-days:' in ${DEPENDABOT}, vond er ${treffers.length}`,
    );
  }
  return Number(treffers[0][1]);
}

describe("dependabot.yml", () => {
  it("draagt de npm-ecosysteem-ingang", () => {
    const regels = zonderCommentaar(lees(DEPENDABOT));
    // Positieve controle: de commentaarstrip laat werkelijk iets over.
    expect(regels.length).toBeGreaterThan(5);
    expect(regels.some((r) => /package-ecosystem:\s*"npm"/.test(r))).toBe(true);
    expect(regels.some((r) => /^\s*cooldown:\s*$/.test(r))).toBe(true);
  });

  it("wacht minstens zeven dagen op een nieuwe versie", () => {
    expect(wachttijd(lees(DEPENDABOT))).toBeGreaterThanOrEqual(MINIMALE_WACHTTIJD_DAGEN);
  });

  it("legt vast waarom die wachttijd geen security-fix ophoudt", () => {
    // Zonder dit onderscheid leest de wachttijd als een reden om hem weer weg
    // te halen: hij zou dan een kwetsbaarheid ruilen voor een andere.
    // `cooldown` geldt alleen voor version updates, niet voor security updates.
    expect(lees(DEPENDABOT)).toContain("security updates");
  });

  it("wachttijd() gooit als de sleutel ontbreekt of dubbel staat", () => {
    expect(() => wachttijd("updates:\n  - package-ecosystem: npm\n")).toThrow(/vond er 0/);
    expect(() => wachttijd("default-days: 7\ndefault-days: 3\n")).toThrow(/vond er 2/);
    // En een uitgecommentarieerde regel telt niet mee.
    expect(() => wachttijd("# default-days: 7\n")).toThrow(/vond er 0/);
  });
});

describe("dependency-audit.yml", () => {
  it("draait de handtekening-poort", () => {
    const regels = zonderCommentaar(lees(WORKFLOW));
    expect(regels.length).toBeGreaterThan(10);
    expect(regels.some((r) => /^\s*run:\s*npm audit signatures\s*$/.test(r))).toBe(true);
    // De advisory-poort blijft ernaast staan; ze beantwoorden een andere vraag.
    expect(regels.some((r) => /^\s*run:\s*npm run audit:deps\s*$/.test(r))).toBe(true);
  });

  it("laat geen enkele stap fail-open draaien", () => {
    // Een poort met `continue-on-error: true` rapporteert wel en houdt niets
    // tegen. Dat is stiller dan geen poort, want het vinkje blijft groen.
    expect(zonderCommentaar(lees(WORKFLOW)).some((r) => /continue-on-error/.test(r))).toBe(false);
  });

  it("de scan vindt niet zomaar alles", () => {
    // Zonder deze controle is elke groene uitkomst hierboven ook te verklaren
    // door een scan die op elke regel `true` teruggeeft.
    const regels = zonderCommentaar(lees(WORKFLOW));
    expect(regels.some((r) => /^\s*run:\s*npm audit zzzniet\s*$/.test(r))).toBe(false);
  });
});
