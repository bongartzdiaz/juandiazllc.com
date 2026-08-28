import { readFileSync } from "node:fs";
import { join } from "node:path";

// De uitkomstentabel in docs/claims.md is de enige bron voor de vier
// klantcijfers. Twee poorten lezen hem — lib/introducties.test.ts (elk bericht
// draagt precies één metric) en lib/partners.test.ts (een partnertekst draagt
// er juist géén) — en die deelden tot 2026-08-28 elk een eigen parser-kopie in
// spe. Twee kopieën van dezelfde parser lopen uiteen en dan bewaakt de
// zwakste; vandaar één module. Zelfde vorm als lib/i18n/enkele-taal.ts.

const CLAIMS_PAD = join(__dirname, "..", "docs", "claims.md");

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** De vier metrics uit de uitkomstentabel in docs/claims.md. Geparst uit de
    sectie zelf, want elders in dat bestand staan ook backtick-cellen. */
export function metricsUitClaims(): string[] {
  const md = lees(CLAIMS_PAD);
  const start = md.indexOf("### The four operator outcomes");
  if (start < 0) {
    throw new Error(
      "docs/claims.md draagt de kop '### The four operator outcomes' niet " +
        "meer. Zet hem terug of werk deze parser bij — de poorten op " +
        "docs/introducties.md en docs/partners.md hangen aan die tabel.",
    );
  }
  const eind = md.indexOf("\n#### ", start);
  const sectie = md.slice(start, eind < 0 ? undefined : eind);
  const metrics = [...sectie.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) =>
    m[1].trim(),
  );
  if (metrics.length !== 4) {
    throw new Error(
      `de uitkomstentabel in docs/claims.md telt ${metrics.length} rijen, ` +
        "verwacht 4. Een tekst zonder rij is een claim zonder bron.",
    );
  }
  return metrics;
}
