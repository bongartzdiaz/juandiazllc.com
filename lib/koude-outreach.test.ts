import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT } from "@/lib/i18n/dict";
import { metricsUitClaims } from "@/lib/claims-uitkomsten";

// docs/koude-outreach.md draagt negen berichten naar mensen die Juan NIET kent,
// plus drie broadcast-mails als voorraad. Dat is een ander risico dan
// docs/introducties.md, waar de ontvanger het cijfer zelf heeft meegemaakt.
//
// Wat deze poort bewaakt, en waarom telkens juist dat:
//
// 1. EEN CIJFER ZONDER BRON. Zelfde regel als bij de introducties: elk getal
//    komt uit de uitkomstentabel in docs/claims.md. Maar koud is strenger,
//    want de lezer kan het niet navertellen. De metrics worden daarom geparst
//    via lib/claims-uitkomsten.ts (dezelfde parser als introducties en
//    partners, nu drie afnemers) in plaats van hier overgeschreven.
//
// 2. EEN SPOOR DAT HET CIJFER VAN EEN ANDER SPOOR LEENT. Spoor A verkoopt aan
//    zonne-installateurs met de +38% die een zonne-installateur haalde. Leent
//    A het cijfer van B, dan staat er een claim over een sector waar hij niet
//    vandaan komt. Dat is het soort fout dat niemand opmerkt zolang het getal
//    zelf klopt.
//
// 3. EEN E-MAIL ZONDER AFMELDREGEL. Bij een opt-out-regime is dat geen
//    beleefdheid maar de voorwaarde waaronder het bericht mag. Ontbreekt hij,
//    dan is het bericht niet "minder netjes" maar niet toegestaan.
//
// 4. DE JURIDISCHE GRENS DIE STIL VERDWIJNT. §1 draagt de reden dat de kopij
//    is zoals hij is. Verdwijnt die sectie bij een herschrijving, dan leest
//    de rest als een gewone campagne en gaat hij naar adressen die niet mogen.
//
// Wat deze poort NIET kan zien: of een ontvanger een rechtspersoon is, of een
// adres werkelijk voor acquisitie is gepubliceerd, en of het bericht klopt met
// wat dat bedrijf werkelijk doet. Dat is per prospect werk, en het document
// zegt dat zelf. Zie ook feedback_consistentiepoort_ziet_geen_gedeeld_gat:
// deze poort toetst dekking (elk bericht draagt X), niet of twee documenten
// hetzelfde zeggen.

const WORTEL = join(__dirname, "..");
const DOC_PAD = join(WORTEL, "docs", "koude-outreach.md");

const EURO = String.fromCharCode(0x20ac);

/** Drie koude sporen van drie berichten. Verandert dat, dan is het een
    beslissing en hoort dit getal in dezelfde commit mee te bewegen. */
const KOUDE_BERICHTEN = 9;
const BROADCAST_MAILS = 3;

const AFMELDREGEL = /Liever geen berichten meer van mij|Afmelden:/;

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

/** Elk bericht staat in een fenced blok; alles daarbuiten is toelichting. */
function blokken(md: string): string[] {
  return [...md.matchAll(/\n```\n([\s\S]*?)\n```\n/g)].map((m) => m[1]);
}

const DOC = lees(DOC_PAD);
const BLOKKEN = blokken(DOC);
const METRICS = metricsUitClaims();

/** De negen koude berichten staan vóór §6, de drie broadcast-mails erna. */
const SPLITS = DOC.indexOf("## §6");
const KOUD = blokken(DOC.slice(0, SPLITS));
const BROADCAST = blokken(DOC.slice(SPLITS));

describe("docs/koude-outreach.md", () => {
  // Positieve controles eerst. Zonder deze slaagt alles hieronder ook op een
  // leeg document: nul berichten zonder afmeldregel leest identiek aan negen
  // berichten mét. Zie feedback_verify_the_measuring_stick.
  it("levert twaalf berichten op, gesplitst in negen koud en drie broadcast", () => {
    expect(BLOKKEN).toHaveLength(KOUDE_BERICHTEN + BROADCAST_MAILS);
    expect(SPLITS).toBeGreaterThan(0);
    expect(KOUD).toHaveLength(KOUDE_BERICHTEN);
    expect(BROADCAST).toHaveLength(BROADCAST_MAILS);
  });

  it("parst vier metrics uit claims.md, waaronder de euro-uitkomst", () => {
    expect(new Set(METRICS).size).toBe(4);
    expect(METRICS.some((m) => m.startsWith(EURO))).toBe(true);
  });

  it("draagt geen bedrag dat claims.md niet kent", () => {
    // Dekt de sprintprijs zonder hem hier te dupliceren. Elk euro-bedrag moet
    // óf een uitkomst uit de tabel zijn, óf de prijs die claims.md draagt.
    const bedragen = (t: string) =>
      [...t.matchAll(new RegExp(EURO + "\\s?\\d(?:[\\d.,]*\\d)?", "g"))].map((m) =>
        m[0].replace(/\s/g, ""),
      );
    // Positieve controle in beide richtingen: de detector moet aantoonbaar
    // iets kunnen vinden en aantoonbaar iets kunnen missen.
    expect(bedragen(`vaste prijs ${EURO}2.500 excl. btw`)).toEqual([`${EURO}2.500`]);
    expect(bedragen("dertig dagen, geen bedrag")).toEqual([]);

    const claims = lees(join(WORTEL, "docs", "claims.md"));
    const toegestaan = new Set([
      ...METRICS.filter((m) => m.startsWith(EURO)),
      `${EURO}2.500`,
    ]);
    // De prijs staat hier alleen omdat claims.md hem draagt; valt die weg,
    // dan mag hij ook hier niet meer staan.
    expect(claims).toContain(`${EURO}2.500`);

    // Alleen de berichten, niet de toelichting: het boetemaximum in §1 is
    // een feit over de wet en geen claim over het aanbod. Een poort die de
    // prose meeneemt, vlagt zijn eigen juridische sectie.
    const vreemd = [...new Set(BLOKKEN.flatMap(bedragen))].filter(
      (b) => !toegestaan.has(b),
    );
    expect(vreemd, "bedrag zonder rij in claims.md").toEqual([]);
  });

  it("geeft elk koud spoor het cijfer van zijn eigen sector", () => {
    // De koppeling loopt via dict.ts: results.rN.sector hoort bij de metric op
    // rij N. Een spoor dat het cijfer van een ander spoor leent, claimt een
    // uitkomst voor een sector die hem niet heeft gehaald.
    const sectoren = [1, 2, 3, 4].map(
      (n) => (DICT.nl as Record<string, string>)[`results.r${n}.sector`],
    );
    expect(sectoren.every((s) => typeof s === "string" && s.length > 3)).toBe(true);

    // De drie koude sporen staan in §3, §4 en §5 en dragen rij 1, 2 en 3.
    const fout: string[] = [];
    for (const n of [3, 4, 5]) {
      const start = DOC.indexOf(`## §${n} `);
      const eind = DOC.indexOf(`## §${n + 1} `);
      expect(start, `§${n} ontbreekt`).toBeGreaterThan(0);
      expect(eind, `§${n + 1} ontbreekt`).toBeGreaterThan(start);
      const sectie = DOC.slice(start, eind);

      const eigen = METRICS[n - 3];
      const vreemde = METRICS.filter((m) => m !== eigen).filter((m) =>
        sectie.includes(m),
      );
      if (!sectie.includes(eigen)) fout.push(`§${n} draagt zijn eigen metric ${eigen} niet`);
      if (vreemde.length) fout.push(`§${n} leent ${vreemde.join(", ")}`);
    }
    expect(fout).toEqual([]);
  });

  it("draagt in de BERICHTEN geen prestatiecijfer dat claims.md niet kent", () => {
    // Deze assertie bestaat omdat de test hierboven een mutant liet leven.
    // Die controleert of §4 de metric 3.2x draagt — en dat deed hij, want de
    // "Bewijs:"-regel bovenaan de sectie droeg hem nog, terwijl het BERICHT
    // eronder 3.9x was gaan zeggen. Een bewaakte invoer zegt niets over een
    // onbewaakte uitkomst; wat de prospect leest is het bericht, niet de kop.
    // Zie feedback_bewaakte_invoer_onbewaakte_uitkomst.
    const kern = (t: string) =>
      t.replace(/^[+−-]/, "").replace(/\s+/g, "").toLowerCase();
    const cijfers = (t: string) =>
      [...t.matchAll(/[+−-]?\d+(?:[.,]\d+)?\s*(?:%|x\b)/g)].map((m) => kern(m[0]));

    // Positieve controle in beide richtingen: de detector moet aantoonbaar
    // iets kunnen vinden en aantoonbaar iets kunnen missen.
    expect(cijfers("ging 38% omhoog en 3.2x sneller")).toEqual(["38%", "3.2x"]);
    expect(cijfers("in 90 dagen, met vier systemen")).toEqual([]);

    const toegestaan = new Set(METRICS.map(kern));
    expect(toegestaan.has("38%") && toegestaan.has("3.2x")).toBe(true);

    const vreemd = [...new Set(BLOKKEN.flatMap(cijfers))].filter(
      (c) => !toegestaan.has(c),
    );
    expect(vreemd, "prestatiecijfer in een bericht zonder rij in claims.md").toEqual([]);
  });

  it("geeft elke e-mail een afmeldregel, behalve de afsluiters", () => {
    // Positieve controle op de detector zelf.
    expect(AFMELDREGEL.test("Liever geen berichten meer van mij? Eén regel terug.")).toBe(true);
    expect(AFMELDREGEL.test("Afmelden: [afmeldlink]")).toBe(true);
    expect(AFMELDREGEL.test("Succes met je bedrijf.")).toBe(false);

    // De drie afsluiters (A3/B3/C3) zeggen zelf dat er niets meer volgt; daar
    // is een afmeldlink zinloos. Alles wat wél om een reactie vraagt, moet er
    // een dragen. Een bericht vraagt om een reactie als het een vraagteken of
    // een link draagt.
    const vraagt = (b: string) => b.includes("?") || b.includes("juandiazllc.com");
    const zonder = [...KOUD, ...BROADCAST]
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => vraagt(b) && !AFMELDREGEL.test(b))
      .map(({ i }) => `bericht ${i + 1}`);
    expect(zonder, "vraagt om een reactie maar draagt geen afmeldregel").toEqual([]);
  });

  it("stelt in elk koud eerste bericht precies één vraag", () => {
    // A1, B1, C1 — de openers. Twee vragen maken van een opener een enquête.
    // De afmeldregel draagt zelf een vraagteken ("Liever geen berichten
    // meer van mij?") en dat is geen vraag aan de prospect. Meetellen maakt
    // de regel onhaalbaar zodra je het bericht juridisch correct afsluit.
    const zonderAfmelding = (b: string) =>
      b.split("\n").filter((r) => !AFMELDREGEL.test(r)).join("\n");
    const openers = [KOUD[0], KOUD[3], KOUD[6]].map(zonderAfmelding);
    const fout = openers
      .map((b, i) => ({ n: ["A1", "B1", "C1"][i], vragen: (b.match(/\?/g) ?? []).length }))
      .filter((x) => x.vragen !== 1)
      .map((x) => `${x.n}: ${x.vragen} vraagtekens`);
    expect(fout).toEqual([]);
  });

  it("houdt de juridische grens in het document", () => {
    // Verdwijnt §1, dan leest de rest als een gewone campagne en gaat hij naar
    // adressen die niet mogen. Dit is de enige sectie waarvan het weghalen
    // gevolgen buiten de repo heeft.
    expect(DOC).toContain("## §1 ");
    expect(DOC).toMatch(/eenmanszaak/i);
    expect(DOC).toMatch(/opt-?out/i);
    // Duitsland blijft verboden — dezelfde regel als docs/kanalen.md §3.
    const kanalen = lees(join(WORTEL, "docs", "kanalen.md"));
    expect(kanalen).toMatch(/koude e-mail naar Duitsland/i);
    expect(DOC).toMatch(/Duitsland/);
  });

  it("noemt geen klantnaam", () => {
    // claims.md draagt sector en venster, nooit een naam. Een koud bericht dat
    // een klant noemt, publiceert een referentie die niemand heeft gegeven.
    const sectoren = [1, 2, 3, 4].map(
      (n) => (DICT.nl as Record<string, string>)[`results.r${n}.sector`],
    );
    // Elke sector moet als omschrijving voorkomen; dat is het bewijs dat de
    // tekst op sectorniveau blijft in plaats van op naam.
    const doc = DOC.toLowerCase();
    const genoemd = sectoren.filter((s) => doc.includes(s.toLowerCase()));
    expect(genoemd.length, "geen enkele sector herkenbaar benoemd").toBeGreaterThan(0);
  });

  it("belooft geen uitkomst", () => {
    // claims.md: geen garantie op de uitkomst, wel op de levering. Een koud
    // bericht dat een resultaat belooft, verkoopt iets dat niet is besloten.
    // "geen garantie op het resultaat" is JUIST de zin die claims.md
    // voorschrijft. Strip de ontkenning voordat je op de belofte zoekt,
    // anders vlagt de poort precies de formulering die hij moet afdwingen.
    const belooft = (t: string) =>
      /\bgegarandeerd\b|\bgaranderen\b|\bgarantie op (?:het|je|de)\b/i.test(
        t.replace(/\bgeen\s+garantie\b/gi, ""),
      );
    // Positieve controle in beide richtingen.
    expect(belooft("gegarandeerd meer leads")).toBe(true);
    expect(belooft("wij garanderen een hogere conversie")).toBe(true);
    expect(belooft("ik geef geen garantie op het resultaat")).toBe(false);
    expect(belooft(DOC)).toBe(false);
  });
});
