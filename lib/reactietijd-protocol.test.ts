import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* De poort op docs/reactietijd-meting.md.
 *
 * Dat document is een operator-protocol, geen gepubliceerde kopij — maar het
 * draagt vier sjablonen die Juan letterlijk verstuurt. Op het moment dat hij er
 * een kopieert is het wél kopij, en dan gelden dezelfde regels als voor de site:
 * geen claim die niet in docs/claims.md staat.
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

/** De vier onderwerpregels waarmee elk sjabloon zichzelf identificeert. */
const AANVRAAG = "Vraag over jullie offertetraject";
const SPOOR_A = "Re: <hun onderwerp>";
const SPOOR_B1 = "Mijn vraag van dinsdag";
const SPOOR_B2 = "Jullie contactformulier";

function sjabloon(onderwerp: string): string {
  const treffers = SJABLONEN.filter((s) => s.includes("Onderwerp: " + onderwerp));
  expect(treffers, "geen uniek sjabloon met onderwerp " + onderwerp).toHaveLength(1);
  return treffers[0];
}

/* B-2 ligt stil tot een jurist de vraag uit §1 heeft beantwoord. Twee regels
 * dragen die toestand — één in het document en één in het sjabloon — en de
 * poort eist dat ze samen bewegen. */
const GEBLOKKEERD = "[NIET VERSTUREN";
/* De VETGEDRUKTE vorm, want de kale tekst staat ook in de vrijgave-instructie
 * verderop in het document. Op die kale vorm matchen zou de schakelaar
 * dichtlassen: §1 omzetten had dan geen effect en de gedocumenteerde vrijgave
 * liep rood. Gevonden door de mutatie die GROEN hoorde te zijn. */
const STATUS_OPEN = "**Status: niet bevestigd.**";

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
  it("draagt de vier sjablonen die verstuurd worden", () => {
    // Zonder deze telling is elke controle hieronder vacuüm: nul sjablonen
    // overtreden per definitie niets.
    expect(SJABLONEN).toHaveLength(4);
    for (const onderwerp of [AANVRAAG, SPOOR_A, SPOOR_B1, SPOOR_B2]) sjabloon(onderwerp);
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
    expect(sjabloon(SPOOR_A)).toContain("juandiazllc.com/nl/tools/lekkage-scan");
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

/* Spoor B is opgesplitst omdat de twee berichten niet van dezelfde soort zijn.
 * B-1 is een herinnering aan een onbeantwoorde vraag — gewone correspondentie,
 * mag vandaag. B-2 noemt de meting en komt van een partij met een belang; die
 * ligt stil tot de vraag uit §1 beantwoord is. Deze poort bewaakt dat het
 * verschil niet vervaagt. */
describe("spoor B", () => {
  it("houdt B-1 vrij van elk aanbod", () => {
    // Dát is wat hem gewone correspondentie maakt in plaats van marketing.
    // Eén link naar de scan en het onderscheid is weg.
    const b1 = sjabloon(SPOOR_B1);
    for (const verboden of ["lekkage-scan", "/tools/", "2.241", "Harvard", "blueprint", "sprint"]) {
      expect(b1.includes(verboden), "B-1 draagt een aanbod: " + verboden).toBe(false);
    }
    // Positieve controle: spoor A draagt de scan-link wél. Zonder deze regel
    // zou de lijst hierboven ook slagen op een verwisseld of leeg sjabloon.
    expect(sjabloon(SPOOR_A)).toContain("lekkage-scan");
  });

  it("houdt B-2 vrij van een vervolgstap", () => {
    // Een bericht dat niets vraagt is het enige dat je kunt sturen aan iemand
    // die je niets heeft gevraagd. Zodra er een link of een uitnodiging in
    // staat is het een koude verkoopmail en niet meer wat het document belooft.
    const b2 = sjabloon(SPOOR_B2);
    for (const verboden of ["lekkage-scan", "/tools/", "http", "Boek ", "plan een"]) {
      expect(b2.includes(verboden), "B-2 draagt een vervolgstap: " + verboden).toBe(false);
    }
  });

  /* De schakelaar. Twee regels dragen dezelfde toestand — de status in §1 en de
   * blokkade in het sjabloon — en ze moeten samen bewegen. Een vrijgegeven
   * sjabloon naast een document dat nog "niet bevestigd" zegt is precies de
   * toestand waarin iemand over een half jaar de verkeerde conclusie trekt. */
  it("koppelt de blokkade op B-2 aan de status in §1", () => {
    const geblokkeerd = sjabloon(SPOOR_B2).includes(GEBLOKKEERD);
    const open = DOC.includes(STATUS_OPEN);
    expect(
      geblokkeerd,
      geblokkeerd
        ? "B-2 is geblokkeerd maar §1 zegt niet meer dat de vraag openstaat"
        : "B-2 is vrijgegeven terwijl §1 nog op '" + STATUS_OPEN + "' staat",
    ).toBe(open);
  });

  it("draagt altijd een status, ook na vrijgave", () => {
    // Vrijgeven doe je door de status te wijzigen, niet door hem weg te halen.
    expect(DOC).toMatch(/\*\*Status: .+\.\*\*/);
  });

  it("noemt één herinnering en niet meer", () => {
    expect(DOC).toMatch(/Eén herinnering, daarna niets/);
    expect(DOC).toMatch(/niet-benaderen-lijst/);
  });
});
