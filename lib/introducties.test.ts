import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT } from "@/lib/i18n/dict";
import { metricsUitClaims } from "@/lib/claims-uitkomsten";

// docs/introducties.md draagt vier berichten die Juan met de hand verstuurt
// naar de vier klanten uit de uitkomstentabel in docs/claims.md. Deze poort
// bewaakt wat daar mechanisch aan kan rotten:
//
// 1. EEN CIJFER DAT WEGDRIJFT VAN ZIJN BRON. Elk bericht draagt de metric die
//    die klant zelf haalde. Wijzigt de tabel in claims.md, dan moet dit
//    document mee — en andersom mag hier geen cijfer staan dat de tabel niet
//    draagt. De metrics worden daarom uit claims.md geparst, niet
//    overgeschreven: een tweede kopie van hetzelfde getal is precies waarvoor
//    dat bestand bestaat.
//
// 2. EEN AANBOD DAT ER STIEKEM IN SLUIPT. De vorm is: cijfer, één vraag, geen
//    aanbod, geen link, geen bijlage (docs/kanalen.md §2.1). Een URL, een
//    tweede vraagteken of een bedrag dat geen uitkomst is, maakt van een
//    gunstvraag een pitch.
//
// 3. EEN SECTORNAAM DIE AFWIJKT VAN DE SITE. De koppeling bericht→klant loopt
//    via sector plus venster; die namen komen uit results.r1..r4.sector in
//    dict.ts en mogen hier niet zelfstandig muteren.
//
// Wat deze poort NIET kan zien: of een bericht klopt met wat er in dat
// traject werkelijk gebeurd is, en of er een bijlage wordt meegestuurd bij
// het versturen. Daar is Juan voor — het document zegt dat zelf ook.

const WORTEL = join(__dirname, "..");
const DOC_PAD = join(WORTEL, "docs", "introducties.md");

const EURO = String.fromCharCode(0x20ac);
const VERWACHT_AANTAL = 4;

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** De berichten staan elk in een fenced blok. Alles daarbuiten is toelichting. */
function berichten(md: string): string[] {
  return [...md.matchAll(/\n```\n([\s\S]*?)\n```\n/g)].map((m) => m[1]);
}

// De metric-parser woont sinds 2026-08-28 in lib/claims-uitkomsten.ts, omdat
// lib/partners.test.ts dezelfde tabel leest. Eén parser, twee afnemers.

const DOC = lees(DOC_PAD);
const BLOKKEN = berichten(DOC);
const METRICS = metricsUitClaims();

describe("docs/introducties.md", () => {
  // Positieve controles eerst. Zonder deze slaagt elke assertie hieronder ook
  // op een leeg document of een lege tabel — een kapotte extractie leest dan
  // precies hetzelfde als een schone meting.
  it("levert vier berichten op", () => {
    expect(BLOKKEN).toHaveLength(VERWACHT_AANTAL);
  });

  it("parst vier verschillende metrics uit claims.md, waaronder de euro-uitkomst", () => {
    expect(new Set(METRICS).size).toBe(4);
    // De euro-metric is de lastigste voor elke detector hieronder; dat de
    // parser hem vindt bewijst dat de tabel-extractie niet half leest.
    expect(METRICS.some((m) => m.startsWith(EURO))).toBe(true);
  });

  it("koppelt elke metric aan precies één bericht, en elk bericht aan precies één metric", () => {
    const fout: string[] = [];
    for (const metric of METRICS) {
      const dragers = BLOKKEN.filter((b) => b.includes(metric)).length;
      if (dragers !== 1) fout.push(`metric ${metric}: ${dragers} berichten, verwacht 1`);
    }
    BLOKKEN.forEach((b, i) => {
      const draagt = METRICS.filter((m) => b.includes(m)).length;
      if (draagt !== 1) fout.push(`bericht ${i + 1}: ${draagt} metrics, verwacht 1`);
    });
    expect(fout).toEqual([]);
  });

  it("stelt in elk bericht precies één vraag", () => {
    const fout = BLOKKEN.map((b, i) => ({ n: i + 1, vragen: b.split("?").length - 1 }))
      .filter((x) => x.vragen !== 1)
      .map((x) => `bericht ${x.n}: ${x.vragen} vraagtekens`);
    expect(fout).toEqual([]);
  });

  it("draagt geen link in een bericht", () => {
    // Positieve controle: de detector moet aantoonbaar iets kunnen vinden.
    const link = (t: string) =>
      /https?:\/\//.test(t) || /\bwww\./.test(t) || t.includes("juandiazllc.com");
    expect(link("lees https://voorbeeld.nl even")).toBe(true);
    expect(link("kijk op juandiazllc.com/nl")).toBe(true);
    expect(link("een naam is genoeg")).toBe(false);

    const met = BLOKKEN.map((b, i) => (link(b) ? `bericht ${i + 1}` : "")).filter(Boolean);
    expect(met).toEqual([]);
  });

  it("draagt nergens een bedrag dat geen uitkomst uit claims.md is", () => {
    // Dit dekt ook de sprintprijs zonder hem hier te dupliceren: elk
    // euro-bedrag dat niet als metric in de uitkomstentabel staat, is fout.
    const bedragen = (t: string) =>
      [...t.matchAll(new RegExp(EURO + "\\s?\\d(?:[\\d.,]*\\d)?", "g"))].map((m) =>
        m[0].replace(/\s/g, ""),
      );
    // Positieve controle in beide richtingen.
    expect(bedragen(`kost ${EURO}2.500 excl. btw`)).toEqual([`${EURO}2.500`]);
    expect(bedragen("kost dertig dagen")).toEqual([]);

    const toegestaan = new Set(METRICS.filter((m) => m.startsWith(EURO)));
    const vreemd = bedragen(DOC).filter((b) => !toegestaan.has(b));
    expect(vreemd).toEqual([]);
  });

  it("noemt de vier sectoren zoals dict.ts ze schrijft", () => {
    const sectoren = [1, 2, 3, 4].map(
      (n) => (DICT.nl as Record<string, string>)[`results.r${n}.sector`],
    );
    expect(sectoren.every((s) => typeof s === "string" && s.length > 3)).toBe(true);

    const doc = DOC.toLowerCase();
    const ontbreekt = sectoren.filter((s) => !doc.includes(s.toLowerCase()));
    expect(ontbreekt).toEqual([]);
  });

  it("herhaalt het automatiseringsverbod woordelijk", () => {
    // De reageer-routine in ditzelfde document grenst aan het verbod uit
    // docs/bereik-plan.md §6; de zin die de grens trekt moet er staan.
    expect(DOC).toContain("Connectieverzoeken en DM's worden nooit geautomatiseerd");
  });
});
