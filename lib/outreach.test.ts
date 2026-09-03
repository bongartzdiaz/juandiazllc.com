import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT } from "@/lib/i18n/dict";
import { metricsUitClaims } from "@/lib/claims-uitkomsten";

// docs/outreach.md is de enige ingang voor het benaderwerk: de volgorde, de
// twee opvolgberichten die nergens bestonden, en de sjabloon voor het
// register. Deze poort bewaakt wat daar mechanisch aan kan rotten:
//
// 1. KOPIJ DIE ZICH VERDUBBELT. Het document verwijst naar docs/introducties.md
//    en docs/partners.md en herhaalt hun teksten niet. Zodra het dat wel doet,
//    dragen twee bestanden dezelfde zin en loopt de zwakste voorop. Dat is in
//    deze repo de vaakst terugkerende bugklasse; vandaar dat het als assertie
//    staat en niet als afspraak.
//
// 2. EEN NAAM IN EEN PUBLIEKE REPO. Het register woont in een spreadsheet
//    buiten deze repo. docs/outreach-register.csv is alleen de sjabloon, en de
//    kolom `wie` hoort daar leeg te blijven. Vult iemand hem in en commit hij
//    dat, dan is dat luid in plaats van stil.
//
// 3. EEN OPVOLGING DIE ZWAARDER WORDT DAN BERICHT 1. Een opvolging draagt geen
//    cijfer, geen bedrag, geen URL en hooguit een vraagteken — anders is het
//    een tweede gunstvraag in plaats van een uitweg.
//
// 4. EEN VERWIJZING NAAR IETS DAT ER NIET IS. Een ingang die naar een
//    verdwenen document wijst, is erger dan geen ingang.
//
// Wat deze poort NIET kan zien: of een bericht past bij die relatie, of de
// stand in het eerste hoofdstuk nog klopt, en wat er in de spreadsheet staat.
// Het eerste weet Juan, het tweede is een hermeting, en het derde staat
// bewust buiten deze repo.

const WORTEL = join(__dirname, "..");
const DOC_PAD = join(WORTEL, "docs", "outreach.md");
const CSV_PAD = join(WORTEL, "docs", "outreach-register.csv");
const INTRO_PAD = join(WORTEL, "docs", "introducties.md");
const PARTNER_PAD = join(WORTEL, "docs", "partners.md");

const EURO = String.fromCharCode(0x20ac);
const VERWACHTE_BLOKKEN = 2;

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** De teksten staan elk in een fenced blok. Alles daarbuiten is toelichting. */
function blokken(md: string): string[] {
  return [...md.matchAll(/\n```\n([\s\S]*?)\n```\n/g)].map((m) => m[1]);
}

/** Witruimte platgeslagen, zodat een herformattering geen vals verschil geeft. */
function plat(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}

/** Alle URLs in een tekst, met leestekens aan het eind gestript — een link
    midden in een zin draagt de punt van die zin mee (de les van #225). */
function urls(t: string): string[] {
  return [
    ...t.matchAll(
      /(?:https?:\/\/|www\.)[^\s`")]+|juandiazllc\.com[^\s`")]*/g,
    ),
  ].map((m) => m[0].replace(/[.,;:!?]+$/, ""));
}

/** De sectie tussen twee koppen, op de kop-tekst en niet op het paragraafteken
    — dat laatste overleeft geen enkele shell-laag betrouwbaar. */
function sectie(md: string, vanaf: RegExp, tot: RegExp): string {
  const regels = md.split("\n");
  const i = regels.findIndex((r) => vanaf.test(r));
  if (i < 0) throw new Error(`kop niet gevonden: ${vanaf}`);
  const j = regels.findIndex((r, n) => n > i && tot.test(r));
  return regels.slice(i, j < 0 ? undefined : j).join("\n");
}

/** De eerste kolom van de kolommentabel in het registerhoofdstuk. */
function kolommenUitDoc(md: string): string[] {
  const sec = sectie(md, /^## .*Het register\s*$/, /^## .*Wat hier bewust/);
  const rijen = sec.split("\n").filter((r) => r.trim().startsWith("|"));
  // rijen[0] is de kop, rijen[1] de scheidingslijn.
  return rijen.slice(2).map((r) => r.split("|")[1].trim());
}

const doc = lees(DOC_PAD);
const csv = lees(CSV_PAD).trim();
const intro = lees(INTRO_PAD);
const partner = lees(PARTNER_PAD);

const csvRegels = csv.split("\n");
const csvKop = csvRegels[0].split(",");
const csvRijen = csvRegels.slice(1).map((r) => r.split(","));

describe("docs/outreach.md — de ingang herhaalt de kopij niet", () => {
  it("vindt de twee opvolgberichten (positieve controle op de blokvinder)", () => {
    expect(blokken(doc)).toHaveLength(VERWACHTE_BLOKKEN);
    // en de vinder werkt aantoonbaar ook op de twee documenten waarnaar
    // verwezen wordt — anders slaagt de duplicatiecontrole op lege lijsten
    expect(blokken(intro).length).toBeGreaterThan(0);
    expect(blokken(partner).length).toBeGreaterThan(0);
  });

  it("draagt geen blok dat woordelijk in introducties of partners staat", () => {
    const elders = `${plat(intro)}\n${plat(partner)}`;
    const dubbel = blokken(doc).filter((b) => elders.includes(plat(b)));
    expect(dubbel).toEqual([]);
  });

  it("en andersom: geen bericht uit die twee staat hier woordelijk", () => {
    const hier = plat(doc);
    const dubbel = [...blokken(intro), ...blokken(partner)].filter((b) =>
      hier.includes(plat(b)),
    );
    expect(dubbel).toEqual([]);
  });

  it("de normalisator vindt een blok wel terug in zijn eigen document", () => {
    // zonder deze controle is "nul dubbelingen" ook te verklaren door een
    // normalisator die nooit iets matcht
    const eerste = blokken(intro)[0];
    expect(plat(intro).includes(plat(eerste))).toBe(true);
  });
});

describe("de opvolging blijft lichter dan bericht 1", () => {
  it("draagt geen klantcijfer uit docs/claims.md", () => {
    const metrics = metricsUitClaims();
    expect(metrics.length).toBe(4);
    for (const b of blokken(doc)) {
      const gevonden = metrics.filter((m) => b.includes(m));
      expect(gevonden).toEqual([]);
    }
  });

  it("draagt geen bedrag", () => {
    for (const b of blokken(doc)) {
      expect(b.includes(EURO)).toBe(false);
    }
  });

  it("de opvolging op een introductie draagt geen URL", () => {
    // bericht 1 draagt er ook geen (regel 3 in docs/introducties.md)
    expect(urls(blokken(doc)[0])).toEqual([]);
    // positieve controle: de partnerkopij draagt er wel een, dus de
    // extractor is aantoonbaar niet dood
    expect(urls(partner).length).toBeGreaterThan(0);
  });

  it("de URL-extractor vindt beide vormen, met leestekens gestript", () => {
    // Zonder deze zelftest is de positieve controle hierboven een halve
    // meting: docs/partners.md draagt uitsluitend https-links, dus de
    // kale-domeintak -- precies de vorm waarin iemand een link in een
    // bericht plakt, en de vorm die de assertie hierboven moet vangen --
    // bleef onbewezen. Gemeten met het mutatieharnas op 2026-09-03: die tak
    // uit de regex halen liep GROEN. Nu niet meer.
    expect(urls("kijk op https://juandiazllc.com/nl.")).toEqual([
      "https://juandiazllc.com/nl",
    ]);
    expect(urls("kijk op juandiazllc.com/contact, daar staat het")).toEqual([
      "juandiazllc.com/contact",
    ]);
    expect(urls("geen enkele link in deze zin")).toEqual([]);
  });

  it("draagt hooguit een vraagteken per bericht", () => {
    for (const b of blokken(doc)) {
      expect((b.match(/\?/g) ?? []).length).toBeLessThanOrEqual(1);
    }
    // positieve controle op de teller zelf
    expect(("een? twee?".match(/\?/g) ?? []).length).toBe(2);
  });
});

describe("docs/outreach-register.csv — de sjabloon draagt geen namen", () => {
  it("is met een komma te lezen: geen enkele cel draagt een aanhalingsteken", () => {
    expect(csv.includes('"')).toBe(false);
    expect(csvRijen.length).toBe(7);
    for (const rij of csvRijen) {
      expect(rij.length).toBe(csvKop.length);
    }
  });

  it("laat de kolom `wie` leeg in elke rij", () => {
    const i = csvKop.indexOf("wie");
    expect(i).toBeGreaterThanOrEqual(0);
    const gevuld = csvRijen.filter((r) => r[i].trim() !== "");
    expect(gevuld).toEqual([]);
  });

  it("draagt de vier sectoren zoals dict.ts ze schrijft", () => {
    const sectoren = [1, 2, 3, 4].map(
      (n) => (DICT.nl as Record<string, string>)[`results.r${n}.sector`],
    );
    expect(sectoren.every((s) => typeof s === "string" && s.length > 3)).toBe(
      true,
    );
    const sleutels = csvRijen
      .filter((r) => r[0] === "introductie")
      .map((r) => r[1]);
    expect(sleutels).toEqual(sectoren);
  });

  it("beschrijft in het document precies deze kolommen, in deze volgorde", () => {
    expect(kolommenUitDoc(doc)).toEqual(csvKop);
  });
});

describe("de ingang wijst nergens naar iets dat er niet is", () => {
  it("elk genoemd document bestaat", () => {
    const paden = [
      ...new Set(
        [...doc.matchAll(/docs\/[a-z0-9-]+\.(?:md|csv)/g)].map((m) => m[0]),
      ),
    ];
    expect(paden.length).toBeGreaterThan(3);
    const weg = paden.filter((p) => !existsSync(join(WORTEL, p)));
    expect(weg).toEqual([]);
  });
});
