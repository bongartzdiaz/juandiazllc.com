import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* De poort op docs/reactietijd-meting.md.
 *
 * Dat document is een operator-protocol, geen gepubliceerde kopij — maar het
 * draagt twee sjablonen die Juan letterlijk verstuurt. Op het moment dat hij
 * er een kopieert is het wél kopij, en dan gelden dezelfde regels als voor de
 * site: geen claim die niet in docs/claims.md staat.
 *
 * DE SCOPE IS HET SJABLOON, NIET HET DOCUMENT. Het document moet de 78% juist
 * kunnen bespreken om uit te leggen waarom hij niet mag; een scan over het hele
 * bestand zou daarop vallen. Dat is precies de val waar eerdere tekstscans in
 * deze repo in liepen — zie de sessies van 20 en 21 augustus, waar poorten
 * afgingen op hun eigen toelichting. Vandaar de ```mail-afbakening, en vandaar
 * de assertie onderaan die rood wordt als iemand de scan alsnog verbreedt. */

const WORTEL = join(__dirname, "..");
const DOC = readFileSync(join(WORTEL, "docs", "reactietijd-meting.md"), "utf8");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf8");

/** Alleen wat tussen ```mail en ``` staat: de tekst die de deur uit gaat. */
const SJABLONEN: string[] = [...DOC.matchAll(/```mail\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
const ALLE = SJABLONEN.join("\n");

/* Elk verbod draagt een bewijstekst. Een lege overtreedslijst uit een kapotte
 * regex leest hetzelfde als een schone meting, dus moet elk patroon aantoonbaar
 * kunnen vallen. */
const VERBODEN: { naam: string; patroon: RegExp; bewijs: string; reden: string }[] = [
  {
    naam: "de onvindbare 78%",
    patroon: /78\s?%/,
    bewijs: "78% koopt bij wie het eerst reageert",
    reden: "geen traceerbare bron — docs/claims.md zegt: niet publiceren",
  },
  {
    naam: "de halverende minuut",
    patroon: /halveer/i,
    bewijs: "elke minuut vertraging halveert de kans",
    reden: "bestaat nergens",
  },
  {
    naam: "een uitkomstgarantie",
    patroon: /garanti|geld terug|niks verschuldigd|kosteloos los/i,
    bewijs: "Geen resultaat? Dan ben je ons niks verschuldigd.",
    reden: "geen garantie op de uitkomst — beslist 2026-08-22",
  },
  {
    naam: "een aftellend getal",
    patroon: /nog \w+ plek|laatste \w+ plek|nog maar \w+/i,
    bewijs: "Nog 2 plekken deze week.",
    reden: "drie trajecten en alle drie vrij; een teller zonder onderhouden bron mag niet",
  },
  {
    naam: "een bedrag",
    patroon: /[€$]\s?\d|\d+\s?euro/i,
    bewijs: "De sprint kost €2.500.",
    reden: "een prijs beantwoordt een vraag die in dit bericht nog niet gesteld is",
  },
  {
    naam: "een vergelijking met andere bedrijven",
    patroon: /concurrent|benchmark|ten opzichte van andere/i,
    bewijs: "Wil je weten hoe je scoort ten opzichte van andere installateurs?",
    reden: "dat is de meting van iemand anders, en bij tien bedrijven in één regio herleidbaar",
  },
];

describe("het reactietijd-protocol", () => {
  it("draagt de twee sjablonen die verstuurd worden", () => {
    // Zonder deze telling is elke controle hieronder vacuüm: nul sjablonen
    // overtreden per definitie niets.
    expect(SJABLONEN).toHaveLength(2);
    expect(ALLE.length).toBeGreaterThan(400);
    expect(ALLE).toContain("Juan Diaz");
  });

  it("houdt elke verboden claim uit de sjablonen", () => {
    for (const { naam, patroon, reden } of VERBODEN) {
      expect(patroon.test(ALLE), naam + " staat in een sjabloon — " + reden).toBe(false);
    }
  });

  it("controleert dat met patronen die kúnnen vallen", () => {
    for (const { naam, patroon, bewijs } of VERBODEN) {
      expect(patroon.test(bewijs), "het patroon voor " + naam + " valt niet op zijn eigen bewijs").toBe(true);
    }
  });

  /* De omgekeerde assertie. Het document MOET de verboden claims noemen om uit
   * te leggen waarom ze verboden zijn; alleen de sjablonen mogen ze niet
   * dragen. Verbreedt iemand de scan naar het hele bestand, dan valt deze
   * regel om en niet stilzwijgend de bovenstaande. */
  it("bespreekt die claims wél buiten de sjablonen", () => {
    expect(DOC).toContain("78%");
    expect(DOC).toMatch(/garantie/i);
    expect(DOC).toMatch(/€\s?2\.500/);
  });

  it("wijst naar de bron die de enige toegestane benchmark draagt", () => {
    expect(DOC).toContain("docs/claims.md");
    expect(CLAIMS).toContain("Reactietijd op leads");
    // Het protocol noemt de benchmark buiten het sjabloon, mét zijn twee
    // beperkingen. Zonder die twee zinnen is het een halve waarheid.
    expect(DOC).toContain("2.241");
    expect(DOC).toMatch(/Amerikaans/);
    expect(DOC).toMatch(/kwalificeren/);
  });

  it("verwijst naar een scan-pagina die bestaat", () => {
    expect(ALLE).toContain("juandiazllc.com/nl/tools/lekkage-scan");
    const route = join(WORTEL, "app", "[locale]", "tools", "lekkage-scan", "page.tsx");
    expect(existsSync(route), "de scan-route bestaat niet meer: " + route).toBe(true);
  });

  /* Het log hoort niet in deze repo — hij is publiek en het log draagt namen
   * van bedrijven met hun reactiegedrag. Deze regel houdt tegen dat er ooit
   * een pad in de repo wordt aangewezen. */
  it("wijst het log buiten deze repo aan", () => {
    expect(DOC).toMatch(/Niet in deze repo/);
    expect(DOC).toContain("_metingen/reactietijd-");
    expect(DOC).not.toMatch(/docs\/[\w-]*reactietijd[\w-]*\.csv/);
  });
});
