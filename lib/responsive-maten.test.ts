import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { leesBron } from "@/lib/bronscan";

// `repeat(auto-fit, minmax(320px, 1fr))` belooft een track van MINSTENS
// 320px. Is de container smaller -- een telefoon van 320px met 40px padding
// aan weerszijden houdt 240px over -- dan houdt de browser zich aan die
// belofte en steekt het item eruit.
//
// Normaal zou je dat zien als een horizontale scrollbalk. Hier niet:
// `html, body` dragen `overflow-x: clip` (globals.css, bewuste keuze van
// 2026-08-02, zie de noot daar). De inhoud wordt dus weggeknipt in plaats
// van bereikbaar gemaakt, en dat is erger: je kunt er niet naartoe scrollen.
//
// Gemeten op 2026-09-23 met scripts/responsive-sweep.mjs, over 196 URL's x
// 25 breedtes x 4 talen: 87 gevallen uit deze ene oorzaak, tot 60px buiten
// beeld op /de/insights bij 320px.
//
// `minmax(min(320px, 100%), 1fr)` is de standaardoplossing: 320px zolang dat
// past, anders de containerbreedte. Op brede schermen verandert er niets.
//
// Wat deze poort NIET ziet: vaste px-kolommen zonder minmax
// (`"180px 1fr auto"`), en breekpunten die bij de verkeerde taal horen.
// Die vindt alleen de sweep, want daarvoor moet er echt gerenderd worden.

const WORTEL = join(__dirname, "..");
const MAPPEN = ["app", "components", "lib"];
const EXTENSIES = [".tsx", ".ts", ".css"];

// minmax( gevolgd door een getal + px -- dus zonder min() eromheen.
const KAAL = /minmax\(\s*\d+px/g;

function bestanden(map: string): string[] {
  const uit: string[] = [];
  const loop = (pad: string) => {
    for (const naam of readdirSync(pad)) {
      if (naam === "node_modules" || naam === ".next") continue;
      const vol = join(pad, naam);
      if (statSync(vol).isDirectory()) loop(vol);
      // Dit bestand zelf draagt het patroon in zijn uitleg en in de
      // mutatietest hieronder. Zonder deze uitzondering vlagt de poort
      // zichzelf en is hij altijd rood -- en rood dat altijd rood staat
      // wordt weggehaald.
      else if (naam === "responsive-maten.test.ts") continue;
      else if (EXTENSIES.some((e) => naam.endsWith(e))) uit.push(vol);
    }
  };
  loop(join(WORTEL, map));
  return uit;
}

describe("grid-tracks passen in hun container", () => {
  const alle = MAPPEN.flatMap(bestanden);

  it("vindt bestanden om te controleren", () => {
    // Zonder deze controle zou een kapot pad als "nul overtredingen" lezen.
    expect(alle.length).toBeGreaterThan(50);
  });

  it("geen minmax() met een kale px-ondergrens", () => {
    const overtredingen: string[] = [];
    for (const pad of alle) {
      // Via leesBron, niet readFileSync: lib/bronscan-lezen.test.ts eist één
      // leesroute voor elke poort die de bronboom afloopt, zodat die route
      // muteerbaar is en een poort niet stilletjes langs een ander pad leest.
      const tekst = leesBron(pad);
      const regels = tekst.split(/\r?\n/);
      regels.forEach((regel, i) => {
        for (const treffer of regel.match(KAAL) ?? []) {
          overtredingen.push(
            `${pad.slice(WORTEL.length + 1)}:${i + 1}  ${treffer} -> ` +
              `gebruik minmax(min(...px, 100%), 1fr)`,
          );
        }
      });
    }
    expect(overtredingen).toEqual([]);
  });

  it("de poort kan afgaan: het patroon matcht een kale minmax", () => {
    // Een poort die niet kan falen bewaakt niets. Dit is de mutatietest.
    expect("minmax(320px, 1fr)".match(KAAL)).not.toBeNull();
    expect("minmax(min(320px, 100%), 1fr)".match(KAAL)).toBeNull();
  });
});

// ── tweede vaste maat: de zijpadding van secties ──────────────────────────
//
// `app/globals.css` draagt `--section-pad-x: clamp(20px, 4vw, 40px)` en de
// selector `section` gebruikt hem. Zevenentwintig secties overschreven dat met
// een harde `40px` in een inline style, en een inline style wint altijd.
//
// Onder 1000px is 4vw kleiner dan 40px, dus daar is het token smaller. Op een
// telefoon van 320px gaf de vaste waarde 240px inhoud tegen 280px via het
// token. Boven 1000px verandert er niets: daar klemt de clamp op dezelfde
// 40px.
//
// LET OP bij het aanpassen van deze poort: matchen op de TEKST `40px` is fout.
// `padding: "40px 36px"` (contactkaart) en `padding: "40px 20px"`
// (foutpagina) dragen die tekst ook, maar daar is 40px de verticale waarde.
// Daarom leest deze poort de waarde uit: bij twee of drie waarden is de
// zijkant de tweede, bij vier de tweede en de vierde.

const PADDING = /padding: "([^"]*)"/g;

function zijwaarden(waarde: string): string[] {
  const delen = waarde.trim().split(/\s+/);
  if (delen.length === 2 || delen.length === 3) return [delen[1]];
  if (delen.length === 4) return [delen[1], delen[3]];
  return []; // één waarde: alle kanten gelijk, dat is geen sectiepadding
}

describe("sectiepadding loopt door het token", () => {
  const alle = MAPPEN.flatMap(bestanden).filter((p) => /\.tsx?$/.test(p));

  it("vindt bestanden om te controleren", () => {
    expect(alle.length).toBeGreaterThan(40);
  });

  it("geen inline padding met een vaste zijkant van 40px", () => {
    const overtredingen: string[] = [];
    for (const pad of alle) {
      const regels = leesBron(pad).split(/\r?\n/);
      regels.forEach((regel, i) => {
        for (const m of regel.matchAll(PADDING)) {
          if (zijwaarden(m[1]).some((z) => z === "40px")) {
            overtredingen.push(
              `${pad.slice(WORTEL.length + 1)}:${i + 1}  padding: "${m[1]}" -> ` +
                `gebruik var(--section-pad-x) voor de zijkant`,
            );
          }
        }
      });
    }
    expect(overtredingen).toEqual([]);
  });

  it("de poort kijkt naar de waarde, niet naar de tekst", () => {
    // Dit is de mutatietest, en tegelijk de reden dat deze poort bestaat
    // zoals hij bestaat. De eerste twee MOETEN met rust gelaten worden.
    expect(zijwaarden("40px 36px")).toEqual(["36px"]); // contactkaart
    expect(zijwaarden("40px 20px")).toEqual(["20px"]); // foutpagina
    expect(zijwaarden("20px 40px 0")).toEqual(["40px"]); // wél een overtreding
    expect(zijwaarden("40px")).toEqual([]); // alle kanten gelijk
  });
});
