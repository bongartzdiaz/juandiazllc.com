import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { zonderCommentaar } from "./bronscan";

/* Gate: de typescript-pin en zijn reden blijven bij elkaar.
 *
 * `lib/i18n/kale-tekst.test.ts` parseert TSX met de compiler-API. Dat is de
 * enige plek in de repo die `typescript` importeert, en het is de enige reden
 * dat deze codebase op TS 5 staat.
 *
 * Gemeten op 2026-09-04 in PR #338 (5.9.3 -> 7.0.2, `latest` op npm): 17
 * typecheckfouten, alle zeventien in dat ene bestand. Next 16, React en de
 * andere 78 testbestanden kwamen schoon door. TS 7 is de Go-port en levert
 * geen JS-parser meer: `createSourceFile` bestaat er wel, maar het is de
 * node-FABRIEK (`statements: readonly Statement[]`), niet de parser. Parsen
 * gebeurt in de Go-binary; de JS-kant komt er alleen bij via een
 * tsconfig-gedreven `Program` uit `unstable/sync`.
 *
 * Daarom draagt `.github/dependabot.yml` een `ignore` op de typescript-major.
 * Twee losse feiten die elkaar nodig hebben, in twee bestanden — precies de
 * vorm die in deze repo uit elkaar loopt zonder dat iets dat ziet.
 *
 * DE REGEL IS TWEEZIJDIG, EN DAT IS HET PUNT. Zolang de poort importeert moet
 * de ignore er staan. Verdwijnt de import — iemand herschrijft hem op
 * `unstable/sync`, of haalt hem weg — dan moet de ignore in dezelfde
 * bewerking mee. Anders blijft er een pin staan die niemand nog kan
 * verantwoorden, en dat is hoe een verouderde uitzondering jaren overleeft.
 *
 * WAT HIJ NIET ZIET: of TS 7 inmiddels wél een parser levert. Dat is een
 * feit over een pakket dat wij niet schrijven; een groen vinkje hier zegt
 * alleen dat de twee bestanden het met elkaar eens zijn. */

const WORTEL = join(__dirname, "..");
const POORT = "lib/i18n/kale-tekst.test.ts";
const CONFIG = ".github/dependabot.yml";
const MAPPEN = ["app", "components", "lib", "scripts"];

const IMPORT_TS = /(?:^|\n)\s*import\s+[^\n;]*\bfrom\s*["']typescript["']/;

function lees(rel: string): string {
  return readFileSync(join(WORTEL, rel), "utf8");
}

function bronBestanden(map: string): string[] {
  const uit: string[] = [];
  const wandel = (dir: string) => {
    for (const naam of readdirSync(dir)) {
      const pad = join(dir, naam);
      if (statSync(pad).isDirectory()) {
        if (naam === "node_modules" || naam.startsWith(".")) continue;
        wandel(pad);
      } else if (/\.tsx?$/.test(naam)) {
        uit.push(pad.slice(WORTEL.length + 1).split("\\").join("/"));
      }
    }
  };
  wandel(join(WORTEL, map));
  return uit;
}

function importeertTypescript(bron: string): boolean {
  return IMPORT_TS.test(zonderCommentaar(bron));
}

/** YAML zonder commentaar.
 *
 *  Nodig, en niet decoratief: de toelichting bij de ignore in
 *  `dependabot.yml` noemt `typescript` en `version-update:semver-major`
 *  meermaals, want hij legt precies dit uit. Zonder strip zou de poort op zijn
 *  eigen uitleg slagen — dezelfde val waar `contactadressen`,
 *  `persoon-entiteit`, `verzoeklimiet` en `server-acties` eerder op omvielen.
 *
 *  Knipt op de eerste `#` buiten aanhalingstekens. Escapes binnen een
 *  YAML-scalar worden niet gelezen; dat kost hier niets, want geen enkele
 *  waarde in dit bestand draagt er een. */
function zonderYamlCommentaar(bron: string): string {
  return bron
    .split("\n")
    .map((regel) => {
      let uit = "";
      let quote: string | null = null;
      for (const teken of regel) {
        if (quote) {
          uit += teken;
          if (teken === quote) quote = null;
          continue;
        }
        if (teken === '"' || teken === "'") {
          quote = teken;
          uit += teken;
          continue;
        }
        if (teken === "#") break;
        uit += teken;
      }
      return uit;
    })
    .join("\n");
}

/** Draagt de config een echte ignore op de typescript-major?
 *
 *  Leest het blok onder de `- dependency-name:`-regel op inspringing, in
 *  plaats van een regex over het hele bestand. Een losse regex zou over twee
 *  verschillende ignore-entries heen kunnen matchen en dan een pin melden die
 *  bij een ander pakket hoort. */
function ignoreertTypescriptMajor(yaml: string): boolean {
  const regels = zonderYamlCommentaar(yaml).split("\n");
  for (let i = 0; i < regels.length; i++) {
    const m = /^(\s*)-\s+dependency-name:\s*["']?typescript["']?\s*$/.exec(regels[i]);
    if (!m) continue;
    const inspring = m[1].length;
    const blok: string[] = [];
    for (let j = i + 1; j < regels.length; j++) {
      const r = regels[j];
      if (r.trim() === "") continue;
      const eigen = r.length - r.trimStart().length;
      if (eigen <= inspring) break;
      blok.push(r);
    }
    if (blok.join("\n").includes("version-update:semver-major")) return true;
  }
  return false;
}

describe("de meetlat zelf", () => {
  it("vindt de typescript-import in de poort, en niet in een bestand zonder", () => {
    expect(importeertTypescript(lees(POORT))).toBe(true);
    expect(importeertTypescript(lees("lib/bronscan.ts"))).toBe(false);
  });

  it("leest de ignore uit de config, en niet uit de toelichting eromheen", () => {
    const echt = [
      "updates:",
      '  - package-ecosystem: "npm"',
      "    ignore:",
      '      - dependency-name: "typescript"',
      "        update-types:",
      '          - "version-update:semver-major"',
    ].join("\n");
    expect(ignoreertTypescriptMajor(echt)).toBe(true);

    const alleenCommentaar = [
      "updates:",
      '  - package-ecosystem: "npm"',
      '    # - dependency-name: "typescript"',
      '    #   update-types: ["version-update:semver-major"]',
    ].join("\n");
    expect(ignoreertTypescriptMajor(alleenCommentaar)).toBe(false);
  });

  it("verwart twee ignore-entries niet met elkaar", () => {
    const twee = [
      "    ignore:",
      '      - dependency-name: "typescript"',
      "        update-types:",
      '          - "version-update:semver-patch"',
      '      - dependency-name: "iets-anders"',
      "        update-types:",
      '          - "version-update:semver-major"',
    ].join("\n");
    expect(ignoreertTypescriptMajor(twee)).toBe(false);
  });
});

describe("typescript-pin", () => {
  it("de poort is de enige die typescript importeert", () => {
    const importeurs = MAPPEN.flatMap(bronBestanden).filter((rel) =>
      importeertTypescript(lees(rel)),
    );
    expect(importeurs).toEqual([POORT]);
  });

  it("import en ignore staan of vallen samen", () => {
    const importeert = importeertTypescript(lees(POORT));
    const ignoreert = ignoreertTypescriptMajor(lees(CONFIG));
    expect(ignoreert).toBe(importeert);
  });

  it("de pin in package.json laat alleen major 5 toe zolang de import staat", () => {
    if (!importeertTypescript(lees(POORT))) return;
    const pkg = JSON.parse(lees("package.json")) as {
      devDependencies?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    const spec = pkg.devDependencies?.typescript ?? pkg.dependencies?.typescript;
    expect(spec, "typescript ontbreekt in package.json").toBeTruthy();
    expect(spec).toMatch(/^[\^~]?5(\.|$)/);
  });

  it("de reden staat in beide bestanden, niet alleen in de config", () => {
    expect(lees(CONFIG)).toContain("lib/typescript-pin.test.ts");
    expect(lees(POORT)).toContain(".github/dependabot.yml");
  });
});
