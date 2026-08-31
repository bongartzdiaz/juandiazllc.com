// Poort op docs/content-kalender.md — de enige bron waar de dagelijkse
// content-machine uit mag werken (taak `content-machine-dagelijks` op Juans
// machine, aangemaakt 2026-08-31).
//
// Wat hier bewaakt wordt:
//   1. elke rij draagt een geldige status uit de vaste set — een verzonnen
//      status ("bijna klaar") zou de machine een vrijbrief geven;
//   2. elke juandiazllc-rij draagt een tag die werkelijk in lib/insights.ts
//      bestaat — een verzonnen tag levert een artikel op dat nergens in een
//      cluster valt en als wees in de sitemap belandt;
//   3. elke rij draagt een niet-lege bron — "de machine mag alleen schrijven
//      wat hier staat, met de bron die erbij staat" is anders niet afdwingbaar;
//   4. de refresh-terugval in de slotparagraaf (J2/J5/J6/D1) bestaat en staat
//      op `klaar` — anders valt de machine bij een lege voorraad terug op
//      rijen die er niet zijn of die op Juan wachten;
//   5. de bestanden waar de vaste regels naar verwijzen bestaan — een regel
//      die naar een verdwenen poort wijst is documentatie over niets.
//
// Wat deze poort NIET ziet: of een onderwerp goed gekozen is, en of de
// machine zich aan de regels houdt — dat eerste is van Juan, dat tweede
// bewaken de poorten van de repo's waarin gepubliceerd wordt.
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getAllInsights } from "@/lib/insights";
import { LOCALES } from "@/lib/i18n/dict";

const WORTEL = join(__dirname, "..");
const KALENDER = readFileSync(
  join(WORTEL, "docs", "content-kalender.md"),
  "utf-8",
);

const GELDIGE_STATUS = new Set(["klaar", "wacht", "wachtrij", "live"]);

interface Rij {
  id: string;
  onderwerp: string;
  taal: string;
  tagOfSoort: string;
  bron: string;
  status: string;
}

function rijen(prefix: "J" | "D"): Rij[] {
  const out: Rij[] = [];
  const pat = new RegExp(
    String.raw`^\|\s*(${prefix}\d+)\s*\|(.+)\|(.+)\|(.+)\|(.+)\|\s*(\S+)\s*\|\s*$`,
  );
  for (const regel of KALENDER.split(/\r?\n/)) {
    const m = regel.match(pat);
    if (m) {
      out.push({
        id: m[1],
        onderwerp: m[2].trim(),
        taal: m[3].trim(),
        tagOfSoort: m[4].trim(),
        bron: m[5].trim(),
        status: m[6].trim().replace(/`/g, ""),
      });
    }
  }
  return out;
}

const J = rijen("J");
const D = rijen("D");

describe("content-kalender: structuur", () => {
  it("beide tabellen zijn gevonden en niet leeg — anders meet de rest niets", () => {
    // positieve controle op de parser zelf: een kapotte regex leest als een
    // lege kalender, en een lege kalender laat elke andere assertie slagen
    expect(J.length).toBeGreaterThanOrEqual(5);
    expect(D.length).toBeGreaterThanOrEqual(3);
  });

  it("elke rij draagt een status uit de vaste set", () => {
    for (const r of [...J, ...D]) {
      expect(GELDIGE_STATUS.has(r.status), `${r.id}: status "${r.status}"`).toBe(
        true,
      );
    }
  });

  it("elke rij draagt een niet-lege bron", () => {
    for (const r of [...J, ...D]) {
      expect(r.bron.length, `${r.id} heeft geen bron`).toBeGreaterThan(3);
    }
  });

  it("een `live`-rij draagt een datum — het logboek-doel van dit bestand", () => {
    for (const r of [...J, ...D].filter((x) => x.status === "live")) {
      expect(
        /20\d\d-\d\d-\d\d/.test(r.status + r.bron + r.onderwerp),
        `${r.id} staat op live zonder datum`,
      ).toBe(true);
    }
  });
});

describe("content-kalender: juandiazllc-rijen tegen de echte clusters", () => {
  // tags afgeleid uit de bron, niet overgetypt — een tweede lijst naast de
  // eerste is de bugklasse waar dit logboek het vaakst op terugkomt
  const echteTags = new Set<string>();
  for (const l of LOCALES) {
    for (const p of getAllInsights(l)) echteTags.add(p.tag);
  }

  it("de afgeleide tagverzameling is niet leeg en kent de bekende clusters", () => {
    expect(echteTags.size).toBeGreaterThanOrEqual(5);
    expect(echteTags.has("Energy")).toBe(true);
  });

  it("elke J-rij met een tag gebruikt een tag die in lib/insights.ts bestaat", () => {
    for (const r of J) {
      expect(echteTags.has(r.tagOfSoort), `${r.id}: tag "${r.tagOfSoort}"`).toBe(
        true,
      );
    }
  });
});

describe("content-kalender: terugval en verwijzingen", () => {
  it("de refresh-terugval J2/J5/J6/D1 bestaat en staat op klaar", () => {
    const alle = new Map([...J, ...D].map((r) => [r.id, r]));
    for (const id of ["J2", "J5", "J6", "D1"]) {
      const r = alle.get(id);
      expect(r, `terugvalrij ${id} ontbreekt`).toBeDefined();
      expect(r!.status, `terugvalrij ${id} staat niet op klaar`).toBe("klaar");
    }
    // en de slotparagraaf noemt ze ook werkelijk
    expect(KALENDER).toContain("(J2/J5/J6/D1)");
  });

  it("bestanden waar de vaste regels naar verwijzen bestaan", () => {
    for (const pad of [
      "docs/claims.md",
      "docs/linkedin-posts.md",
      "docs/datastuk.md",
      "lib/linkedin-posts.test.ts",
    ]) {
      expect(existsSync(join(WORTEL, pad)), `${pad} bestaat niet`).toBe(true);
    }
  });

  it("de kalender draagt geen enkel bedrag — cijfers horen in claims.md of de bron", () => {
    const euro = String.fromCharCode(0x20ac);
    const treffers = KALENDER.match(
      new RegExp(`${euro}\\s?\\d|\\d\\s?${euro}`, "g"),
    );
    expect(treffers ?? []).toEqual([]);
    // positieve controle: het patroon vindt een bedrag wel degelijk
    expect(new RegExp(`${euro}\\s?\\d`).test(`${euro}197`)).toBe(true);
  });

  it("het automatiseringsverbod voor socials staat er woordelijk in", () => {
    expect(KALENDER).toContain("plaatst niets op LinkedIn");
    expect(KALENDER).toContain("Plaatsen is Juans handeling");
  });
});
