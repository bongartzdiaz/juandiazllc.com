/* Poort op npm audit, met verlopende uitzonderingen.
   ───────────────────────────────────────────────────────────────────────────
   Draaien:
     npx tsx scripts/check-npm-audit.ts
     npx tsx scripts/check-npm-audit.ts --drempel=moderate
     npx tsx scripts/check-npm-audit.ts --json audit.json    (voor debuggen)

   Exitcode 1 zodra er iets te beslissen valt. De logica zit in
   lib/security/audit-gate.ts en is daar getest; dit bestand doet alleen I/O. */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  verzamelAdvisories,
  beoordeel,
  type Ernst,
  leesAuditUitvoer,
  type Uitzondering,
} from "../lib/security/audit-gate";

const args = process.argv.slice(2);
const drempel = ((args.find((a) => a.startsWith("--drempel="))?.split("=")[1] ?? "high") as Ernst);
const jsonPad = args[args.indexOf("--json") + 1];

/** npm audit geeft exitcode 1 zodra er iets gevonden is, dus de fout is hier
 *  verwachte uitvoer en geen probleem. Of de uitvoer bruikbaar is, beoordeelt
 *  leesAuditUitvoer() — leeg is niet het enige onbruikbare geval. */
function haalAudit(): unknown {
  if (jsonPad && args.includes("--json")) {
    return JSON.parse(readFileSync(jsonPad, "utf8"));
  }
  let out = "";
  try {
    out = execFileSync("npm", ["audit", "--json", "--package-lock-only"], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      shell: process.platform === "win32",
    });
  } catch (e) {
    out = (e as { stdout?: string }).stdout ?? "";
  }
  const gelezen = leesAuditUitvoer(out);
  if (!gelezen.ok) {
    console.error(gelezen.reden + " — kon de kwetsbaarheden niet beoordelen.");
    process.exit(1);
  }
  return gelezen.json;
}

function haalUitzonderingen(): Uitzondering[] {
  const pad = join(process.cwd(), "security", "geaccepteerde-advisories.json");
  const raw = JSON.parse(readFileSync(pad, "utf8")) as { uitzonderingen?: Uitzondering[] };
  return raw.uitzonderingen ?? [];
}

const advisories = verzamelAdvisories(haalAudit());
const uitzonderingen = haalUitzonderingen();
const bevindingen = beoordeel(advisories, uitzonderingen, new Date(), drempel);

const relevant = advisories.filter((a) => a.ernst === "high" || a.ernst === "critical");
console.log(
  `npm audit: ${advisories.length} advisories, waarvan ${relevant.length} high of hoger. ` +
    `Uitzonderingen: ${uitzonderingen.length}. Drempel: ${drempel}.`,
);

if (bevindingen.length === 0) {
  console.log("\nNiets te beslissen.");
  process.exit(0);
}

const label: Record<string, string> = {
  "niet-geaccepteerd": "NIET GEACCEPTEERD",
  vervallen: "UITZONDERING VERLOPEN",
  overbodig: "UITZONDERING OVERBODIG",
  onvolledig: "UITZONDERING ONVOLLEDIG",
};

console.log("");
for (const b of bevindingen) {
  console.log(`${label[b.soort] ?? b.soort}  ${b.advisory}`);
  console.log(`    ${b.detail}`);
}
console.log(
  `\n${bevindingen.length} punt(en). Los op, of zet een uitzondering met reden en vervaldatum ` +
    `in security/geaccepteerde-advisories.json.`,
);
process.exit(1);
