import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT } from "@/lib/i18n/dict";
import { metricsUitClaims } from "@/lib/claims-uitkomsten";

// docs/datastuk.md maakt idee 4 uit docs/kanalen.md schrijfklaar: het draagt
// de vier gemeten uitkomsten, de publicatieregels uit kanalen §2.4, en de
// intake-vragen die alleen Juan kan beantwoorden. Deze poort bewaakt wat
// daar mechanisch aan kan rotten:
//
// 1. EEN CIJFER DAT WEGDRIJFT VAN ZIJN BRON. De vier metrics staan hier
//    precies één keer, woordelijk zoals de uitkomstentabel in docs/claims.md
//    ze draagt — geparst via lib/claims-uitkomsten.ts, niet overgetypt. Het
//    skelet draagt bewust geen enkele meetwaarde, dus een tweede voorkomen is
//    een metric die de tabel uit kroop.
//
// 2. EEN REGEL DIE STIL VERDWIJNT. "vier is geen steekproef" en de kop
//    "Wat ik hier niet beweer" zijn de twee verplichtingen uit kanalen §2.4;
//    de grens-regel zelf moet daar bovendien nog woordelijk staan.
//
// 3. EEN INTAKE DIE KRIMPT. De vragenlijst telt 27 checkboxes; een vraag die
//    stilletjes verdwijnt maakt het stuk straks dunner zonder dat iemand die
//    keuze nam. Aangevinkt ("[x]") telt gewoon mee — invullen is het doel.
//
// Wat deze poort NIET kan zien: of een antwoord klopt, en of de metrics zelf
// waar zijn. Een metric die vóluit geschreven wordt ("plus achtendertig
// procent") is bovendien onzichtbaar — de vergelijking is letterlijk. Daar is
// Juan voor; het document zegt dat zelf ook.

const WORTEL = join(__dirname, "..");
const DOC_PAD = join(WORTEL, "docs", "datastuk.md");
const KANALEN_PAD = join(WORTEL, "docs", "kanalen.md");

const EURO = String.fromCharCode(0x20ac);
const AANTAL_VRAGEN = 27;

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

function tel(hooiberg: string, naald: string): number {
  return hooiberg.split(naald).length - 1;
}

const DOC = lees(DOC_PAD);
const METRICS = metricsUitClaims();

describe("docs/datastuk.md", () => {
  // Positieve controles eerst — een kapotte extractie leest anders precies
  // hetzelfde als een schone meting.
  it("draagt vier traject-secties plus de meterdata-sectie", () => {
    expect(tel(DOC, "\n### Traject ")).toBe(4);
    expect(DOC).toContain("\n### De meterdata");
  });

  it("draagt elke metric uit claims.md precies één keer, woordelijk", () => {
    // De parser valideert zichzelf (gooit bij != 4 rijen); dit bewijst dat de
    // vergelijking over echte, verschillende metrics loopt.
    expect(new Set(METRICS).size).toBe(4);

    const fout = METRICS.map((m) => ({ m, n: tel(DOC, m) }))
      .filter((x) => x.n !== 1)
      .map((x) => `metric ${x.m}: ${x.n}x, verwacht 1`);
    expect(fout).toEqual([]);
  });

  it("draagt de twee verplichtingen uit kanalen §2.4 woordelijk", () => {
    expect(DOC).toContain("vier is geen steekproef");
    expect(DOC).toContain("Wat ik hier niet beweer");
  });

  it("rust op een grens-regel die nog woordelijk in docs/kanalen.md staat", () => {
    // De zin vouwt daar over een regeleinde; normaliseer witruimte vóór het
    // vergelijken — een grep op één regel mist hem (gemeten 2026-08-28).
    const kanalen = lees(KANALEN_PAD).replace(/\s+/g, " ");
    expect(kanalen).toContain(
      "Geen cijfer dat niet in `docs/claims.md` staat, en vier is geen steekproef",
    );
  });

  it("noemt de vier trajecten zoals dict.ts ze schrijft", () => {
    const sectoren = [1, 2, 3, 4].map(
      (n) => (DICT.nl as Record<string, string>)[`results.r${n}.sector`],
    );
    expect(sectoren.every((s) => typeof s === "string" && s.length > 3)).toBe(true);

    const doc = DOC.toLowerCase();
    const ontbreekt = sectoren.filter((s) => !doc.includes(s.toLowerCase()));
    expect(ontbreekt).toEqual([]);
  });

  it("draagt geen bedrag dat geen uitkomst uit claims.md is", () => {
    const bedragen = (t: string) =>
      [...t.matchAll(new RegExp(EURO + "\\s?\\d(?:[\\d.,]*\\d)?", "g"))].map(
        (m) => m[0].replace(/\s/g, ""),
      );
    // Positieve controle in beide richtingen.
    expect(bedragen(`kost ${EURO}2.500 excl. btw`)).toEqual([`${EURO}2.500`]);
    expect(bedragen("kost negentig dagen")).toEqual([]);

    const toegestaan = new Set(METRICS.filter((m) => m.startsWith(EURO)));
    const vreemd = bedragen(DOC).filter((b) => !toegestaan.has(b));
    expect(vreemd).toEqual([]);
  });

  it("telt zijn intake-vragen, aangevinkt of niet", () => {
    const vragen = [...DOC.matchAll(/^- \[[ x]\] /gm)];
    // Positieve controle: de teller ziet beide vormen.
    expect("- [ ] open\n- [x] gedaan".match(/^- \[[ x]\] /gm)).toHaveLength(2);

    expect(vragen).toHaveLength(AANTAL_VRAGEN);
  });
});
