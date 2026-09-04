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

/** Ecosystemen die géén `cooldown` mogen dragen, met de reden erbij. Een
 *  vrijstelling zonder reden wordt over een jaar weggehaald door iemand die
 *  niet weet waarom hij er stond.
 *
 *  Deze lijst draagt zijn eigen voorwaarde: elke naam erin moet werkelijk in
 *  het bestand staan (zie de test hieronder). Verdwijnt het ecosysteem, dan
 *  valt de vrijstelling om in plaats van stil te blijven liggen. */
const ZONDER_WACHTTIJD: Record<string, string> = {
  "github-actions":
    "GitHub ondersteunt cooldown niet voor dit ecosysteem — gemeten 2026-09-04 " +
    "in de options-reference, waar npm, bundler, cargo, docker, gomod, maven, pip " +
    "en ruim twintig andere wel genoemd worden en github-actions niet. Een " +
    "cooldown-blok daar wordt genegeerd of maakt de configuratie ongeldig; dat " +
    "eerste is erger, want dan lijkt de wachttijd te gelden terwijl hij dat niet doet.",
};

/** Regels zonder commentaar. `#` binnen een YAML-waarde komt in deze twee
 *  bestanden niet voor; zou dat veranderen, dan is dat hier te zien. */
function zonderCommentaar(inhoud: string): string[] {
  return inhoud
    .split(/\r?\n/)
    .map((r) => r.replace(/#.*$/, ""))
    .filter((r) => r.trim() !== "");
}

interface Ingang {
  ecosysteem: string;
  wachttijdDagen: number | null;
}

/** De `updates:`-ingangen met hun wachttijd, in bronvolgorde.
 *
 *  Gooit als een `default-days:` niet aan een ecosysteem is toe te wijzen, of
 *  als één ecosysteem er twee draagt. Dat tweede is de reden dat deze functie
 *  per blok telt en niet per bestand: twee waarden voor één feit is precies
 *  de vorm waarin een poort de verkeerde leest. Sinds er meer dan één
 *  ecosysteem in dit bestand staat, is "precies één per bestand" te grof. */
function ingangen(inhoud: string): Ingang[] {
  const uit: Ingang[] = [];

  for (const regel of zonderCommentaar(inhoud)) {
    const eco = /^\s*-\s*package-ecosystem:\s*"?([\w-]+)"?\s*$/.exec(regel);
    if (eco) {
      uit.push({ ecosysteem: eco[1], wachttijdDagen: null });
      continue;
    }

    const dagen = /^\s*default-days:\s*(\d+)\s*$/.exec(regel);
    if (dagen) {
      const huidig = uit[uit.length - 1];
      if (huidig === undefined) {
        throw new Error(`'default-days:' staat voor de eerste package-ecosystem in ${DEPENDABOT}`);
      }
      if (huidig.wachttijdDagen !== null) {
        throw new Error(
          `twee regels 'default-days:' onder ecosysteem '${huidig.ecosysteem}' in ${DEPENDABOT}`,
        );
      }
      huidig.wachttijdDagen = Number(dagen[1]);
    }
  }

  if (uit.length === 0) {
    throw new Error(`geen enkele 'package-ecosystem:' gevonden in ${DEPENDABOT}`);
  }
  return uit;
}

describe("dependabot.yml", () => {
  it("draagt de npm-ingang met een cooldown", () => {
    const regels = zonderCommentaar(lees(DEPENDABOT));
    // Positieve controle: de commentaarstrip laat werkelijk iets over.
    expect(regels.length).toBeGreaterThan(5);
    expect(regels.some((r) => /package-ecosystem:\s*"npm"/.test(r))).toBe(true);
    expect(regels.some((r) => /^\s*cooldown:\s*$/.test(r))).toBe(true);
  });

  it("draagt de github-actions-ingang", () => {
    // Diezelfde klasse risico: die actions draaien in CI met het repo-token.
    const namen = ingangen(lees(DEPENDABOT)).map((i) => i.ecosysteem);
    expect(namen).toContain("github-actions");
  });

  it("elke wachttijd is minstens zeven dagen", () => {
    const gevonden = ingangen(lees(DEPENDABOT))
      .map((i) => i.wachttijdDagen)
      .filter((d): d is number => d !== null);

    // Zonder deze regel slaagt de lus hieronder ook op nul wachttijden.
    expect(gevonden.length).toBeGreaterThan(0);
    for (const dagen of gevonden) {
      expect(dagen).toBeGreaterThanOrEqual(MINIMALE_WACHTTIJD_DAGEN);
    }
  });

  it("elk ecosysteem heeft een wachttijd, of staat vrijgesteld met reden", () => {
    for (const ingang of ingangen(lees(DEPENDABOT))) {
      if (ingang.wachttijdDagen !== null) continue;
      const reden = ZONDER_WACHTTIJD[ingang.ecosysteem];
      expect(reden, `ecosysteem '${ingang.ecosysteem}' heeft geen cooldown en geen reden`)
        .toBeTruthy();
      // Een reden van drie woorden is geen reden.
      expect(reden.length).toBeGreaterThan(40);
    }
  });

  it("een vrijgesteld ecosysteem draagt ook werkelijk geen cooldown", () => {
    // De andere richting. Een `cooldown` onder github-actions wordt door
    // GitHub genegeerd, en dan claimt dit bestand een wachttijd die niet
    // geldt. Dat is erger dan hem weglaten, dus het mag hier niet staan.
    for (const ingang of ingangen(lees(DEPENDABOT))) {
      if (!(ingang.ecosysteem in ZONDER_WACHTTIJD)) continue;
      expect(
        ingang.wachttijdDagen,
        `'${ingang.ecosysteem}' draagt een cooldown terwijl het ecosysteem die niet ondersteunt`,
      ).toBeNull();
    }
  });

  it("een vrijstelling die niet meer waar is, valt om", () => {
    const namen = ingangen(lees(DEPENDABOT)).map((i) => i.ecosysteem);
    for (const naam of Object.keys(ZONDER_WACHTTIJD)) {
      expect(namen, `'${naam}' staat vrijgesteld maar komt niet meer voor`).toContain(naam);
    }
  });

  it("legt vast waarom die wachttijd geen security-fix ophoudt", () => {
    // Zonder dit onderscheid leest de wachttijd als een reden om hem weer weg
    // te halen: hij zou dan een kwetsbaarheid ruilen voor een andere.
    // `cooldown` geldt alleen voor version updates, niet voor security updates.
    expect(lees(DEPENDABOT)).toContain("security updates");
  });

  it("ingangen() gooit op elke vorm die stil de verkeerde waarde zou opleveren", () => {
    expect(() => ingangen('updates:\n  - directory: "/"\n')).toThrow(/geen enkele/);
    expect(() => ingangen("default-days: 7\n")).toThrow(/voor de eerste/);
    expect(() =>
      ingangen('  - package-ecosystem: "npm"\n    default-days: 7\n    default-days: 3\n'),
    ).toThrow(/twee regels/);
    // Een uitgecommentarieerde regel telt niet mee.
    expect(ingangen('  - package-ecosystem: "npm"\n    # default-days: 7\n')[0].wachttijdDagen)
      .toBeNull();
    // En twee blokken worden ook werkelijk als twee gelezen, elk met de eigen
    // waarde — zonder deze regel is een parser die alles op de laatste ingang
    // plakt niet te onderscheiden van een die het goed doet.
    const twee = ingangen(
      '  - package-ecosystem: "npm"\n    cooldown:\n      default-days: 7\n' +
        '  - package-ecosystem: "github-actions"\n',
    );
    expect(twee.map((i) => [i.ecosysteem, i.wachttijdDagen])).toEqual([
      ["npm", 7],
      ["github-actions", null],
    ]);
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
