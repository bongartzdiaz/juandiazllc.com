import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENKELE_TAAL } from "@/lib/i18n/enkele-taal";
import { metricsUitClaims } from "@/lib/claims-uitkomsten";

// docs/partners.md draagt drie partnerberichten en één doorstuurtekst die Juan
// met de hand verstuurt. Deze poort bewaakt wat daar mechanisch aan kan
// rotten:
//
// 1. EEN LINK DIE NERGENS HEEN GAAT. De enige link in de teksten is de
//    lekkage-scan, en die bestaat alleen op /nl. De URL wordt daarom
//    afgeleid uit ENKELE_TAAL in lib/i18n/enkele-taal.ts — dezelfde bron als
//    de sitemap en ScanCallout — in plaats van overgetypt. Verdwijnt de route
//    uit die lijst, dan valt deze poort om.
//
// 2. EEN CIJFER DAT HIER NIET HOORT. Partnerteksten dragen geen bedragen en
//    geen klantuitkomsten: de vier metrics uit docs/claims.md horen bij de
//    klanten die ze haalden (docs/introducties.md), niet bij een partij die
//    alleen doorverwijst.
//
// 3. EEN BELOFTE DIE STIEKEM VERSCHUIFT. "Geen vergoeding" is de beslissing
//    uit docs/kanalen.md §2.3; elke partnertekst zegt het expliciet, en de
//    bronzin moet daar nog staan.
//
// Wat deze poort NIET kan zien: of een bericht past bij de relatie, en of de
// wederkerigheidszin ("dan noem ik jou") bij die partij past. Daar is Juan
// voor — het document zegt dat zelf ook.

const WORTEL = join(__dirname, "..");
const DOC_PAD = join(WORTEL, "docs", "partners.md");
const KANALEN_PAD = join(WORTEL, "docs", "kanalen.md");

const EURO = String.fromCharCode(0x20ac);
const SCAN_PAD = "/tools/lekkage-scan";

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** De teksten staan elk in een fenced blok. Alles daarbuiten is toelichting. */
function blokken(md: string): string[] {
  return [...md.matchAll(/\n```\n([\s\S]*?)\n```\n/g)].map((m) => m[1]);
}

/** Alle URLs in een tekst, met leestekens aan het eind gestript — een URL
    midden in een zin draagt anders de punt van die zin mee, en dan leest een
    correcte link als een afwijkende. Zelfde val als de prijsregex van #225. */
function urls(t: string): string[] {
  return [...t.matchAll(/(?:https?:\/\/|www\.)[^\s`")]+|juandiazllc\.com[^\s`")]*/g)]
    .map((m) => m[0].replace(/[.,;:!?]+$/, ""));
}

const DOC = lees(DOC_PAD);
const BLOKKEN = blokken(DOC);
const METRICS = metricsUitClaims();
const SCAN_URL = `https://juandiazllc.com/nl${SCAN_PAD}`;

describe("docs/partners.md", () => {
  // Positieve controles eerst. Zonder deze slaagt elke assertie hieronder ook
  // op een leeg document — een kapotte extractie leest dan precies hetzelfde
  // als een schone meting.
  it("levert vier blokken op: drie partnerberichten en de doorstuurtekst", () => {
    expect(BLOKKEN).toHaveLength(4);
  });

  it("leidt de scan-URL af uit ENKELE_TAAL, en die route bestaat in het Nederlands", () => {
    const route = ENKELE_TAAL[SCAN_PAD];
    expect(route).toBeDefined();
    expect(route?.locales).toContain("nl");
  });

  it("draagt in elk blok precies één link, en dat is de lekkage-scan", () => {
    // Positieve controles op de detector, in beide richtingen — inclusief de
    // punt-aan-het-eind die anders een correcte link als afwijkend leest.
    expect(urls("lees https://voorbeeld.nl/pagina. Verder niets")).toEqual([
      "https://voorbeeld.nl/pagina",
    ]);
    expect(urls("kijk op juandiazllc.com/nl even na")).toEqual([
      "juandiazllc.com/nl",
    ]);
    expect(urls("een naam is genoeg")).toEqual([]);

    const fout: string[] = [];
    BLOKKEN.forEach((b, i) => {
      const gevonden = urls(b);
      if (gevonden.length !== 1) {
        fout.push(`blok ${i + 1}: ${gevonden.length} links, verwacht 1`);
      }
      for (const u of gevonden) {
        if (u !== SCAN_URL) fout.push(`blok ${i + 1}: ${u} is niet de scan`);
      }
    });
    expect(fout).toEqual([]);
  });

  it("draagt nergens een bedrag", () => {
    const bedragen = (t: string) =>
      [...t.matchAll(new RegExp(EURO + "\\s?\\d(?:[\\d.,]*\\d)?", "g"))].map(
        (m) => m[0],
      );
    // Positieve controle in beide richtingen.
    expect(bedragen(`kost ${EURO}2.500 excl. btw`)).toHaveLength(1);
    expect(bedragen("kost vier minuten")).toEqual([]);

    expect(bedragen(DOC)).toEqual([]);
  });

  it("draagt geen enkele klantuitkomst uit docs/claims.md", () => {
    // De parser valideert zichzelf (gooit bij != 4 rijen); dit bewijst dat de
    // vergelijking over echte metrics loopt en niet over een lege lijst.
    expect(new Set(METRICS).size).toBe(4);

    const gevonden = METRICS.filter((m) => DOC.includes(m));
    expect(gevonden).toEqual([]);
  });

  it("zegt in elk partnerbericht expliciet dat er geen vergoeding aan vastzit", () => {
    const met = BLOKKEN.filter((b) => /geen vergoeding/i.test(b));
    expect(met).toHaveLength(3);
    // Het ene blok zonder die zin is de doorstuurtekst — die is niet aan de
    // partner gericht en draagt de belofte dus niet.
    const zonder = BLOKKEN.filter((b) => !/geen vergoeding/i.test(b));
    expect(zonder).toHaveLength(1);
    expect(zonder[0]).toContain("Ken je Juan Diaz");
  });

  it("rust op een beslissing die nog woordelijk in docs/kanalen.md staat", () => {
    // De bronzin vouwt daar over een regeleinde; normaliseer witruimte vóór
    // het vergelijken — een grep op één regel mist hem (gemeten 2026-08-28).
    const kanalen = lees(KANALEN_PAD).replace(/\s+/g, " ");
    expect(kanalen).toContain("Geen contract en geen percentage om mee te beginnen");
  });

  it("richt zich op de drie partnersoorten uit docs/kanalen.md §2.3", () => {
    const doc = DOC.toLowerCase();
    for (const soort of ["installateur", "boekhouder", "energie-adviseur"]) {
      expect(doc).toContain(soort);
    }
  });
});
