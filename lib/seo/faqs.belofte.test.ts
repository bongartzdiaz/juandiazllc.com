import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES, type Locale } from "@/lib/i18n/dict";
import {
  HOME_FAQ_BY_LOCALE,
  CONTACT_FAQ_BY_LOCALE,
  SERVICES_FAQ_BY_LOCALE,
} from "./faqs";

// Drie FAQ-sets beschrijven hetzelfde blueprint-gesprek: op de home, op
// /contact en op /services. Tot 2026-08-19 beloofden ze twee verschillende
// dingen, in alle vier de talen:
//
//   home + services  →  "a one-page diagnosis"
//   contact          →  "a two-page written plan within 48 hours"
//
// Eén gesprek, twee beloftes. Dat is geen stijlkwestie: het is wat de
// bezoeker mag verwachten, en waar hij je aan houdt. De contact-set is
// uitgelijnd op één pagina, met behoud van het 48-uursvenster dat de andere
// twee niet hadden.
//
// Deze poort bewaakt niet de formulering — die mag per taal verschillen —
// maar het paginagetal, want dat is het deel dat uiteenliep.
const FAQ_SETS = {
  home: HOME_FAQ_BY_LOCALE,
  contact: CONTACT_FAQ_BY_LOCALE,
  services: SERVICES_FAQ_BY_LOCALE,
} as const;

// Aanduidingen van een deliverable van meer dan één pagina, per taal.
const MEER_DAN_EEN_PAGINA =
  /(two|three)-page|twee pagina|drie pagina|zwei-?seitig|drei-?seitig|zweiseitigen|de dos páginas|de tres páginas/i;

describe("wat het blueprint-gesprek belooft", () => {
  it("geen enkele FAQ belooft meer dan één pagina", () => {
    for (const [naam, set] of Object.entries(FAQ_SETS)) {
      for (const l of LOCALES) {
        const items = set[l];
        expect(items, `${naam}-FAQ ontbreekt voor ${l}`).toBeTruthy();
        for (const { q, a } of items) {
          expect(
            MEER_DAN_EEN_PAGINA.test(a),
            `${naam}-FAQ (${l}) belooft meer dan één pagina terwijl de andere sets ` +
              `één pagina beloven — vraag: "${q}"`,
          ).toBe(false);
        }
      }
    }
  });

  // Assert op de set zelf, niet via een helper met terugval op Engels: een
  // ontbrekende Duitse vertaling zou anders als de Engelse tekst langskomen
  // en de controle stilzwijgend halen.
  it("alle drie de sets zijn in vier talen af", () => {
    for (const [naam, set] of Object.entries(FAQ_SETS)) {
      const lengtes = LOCALES.map((l) => set[l]?.length ?? 0);
      for (const [i, n] of lengtes.entries()) {
        expect(n, `${naam}-FAQ is leeg voor ${LOCALES[i]}`).toBeGreaterThan(0);
      }
      expect(
        new Set(lengtes).size,
        `${naam}-FAQ heeft niet in elke taal evenveel vragen: ${LOCALES.map(
          (l, i) => `${l}=${lengtes[i]}`,
        ).join(", ")}`,
      ).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Wat de diagnosesprint belooft — poort sinds 2026-08-22
//
// Tot die datum beschreef elke oppervlakte de sprint als een *toestand*
// ("beide kanten beperken het risico voordat er gebouwd wordt") en zei geen
// enkele wat je na dertig dagen in handen hebt. Stap 1 van de ladder noemde
// wél een tastbaar ding en stap 3 ook; stap 2 was het gat, in vier talen en
// op twee FAQ-sets tegelijk.
//
// De beslissing staat in docs/claims.md onder "Wat de diagnosesprint
// oplevert". Deze poort bewaakt niet de formulering — die mag per taal
// verschillen — maar drie dingen die uiteen kunnen lopen:
//
//   1. een antwoord dat de sprint noemt, noemt ook wat hij oplevert;
//   2. de ladder draagt de twee toezeggingen die de stap omkeerbaar maken;
//   3. er staat nergens een bedrag, want dat is nog niet beslist.
//
// Punt 3 is de rule-1-poort van docs/claims.md op deze ene belofte: "vaste
// prijs" beschrijft een vorm en mag, een getal mag pas nadat het in claims.md
// staat.

// Noemt dit antwoord de sprint van dertig dagen? Bewust smal: alleen de
// volledige aanduiding telt. "De diagnosesprint heeft een vaste prijs" is een
// prijszin en hoeft de deliverable niet te herhalen.
const NOEMT_SPRINT: Record<Locale, RegExp> = {
  en: /30-day diagnostic sprint/i,
  nl: /diagnosesprint van 30 dagen/i,
  de: /30-tägige[rn]? Diagnose-Sprint/i,
  es: /sprint de diagnóstico de 30 días/i,
};

// Noemt het het ding dat je overhoudt?
const NOEMT_DELIVERABLE: Record<Locale, RegExp> = {
  en: /build plan/i,
  nl: /bouwplan/i,
  de: /Bauplan/i,
  es: /plan de obra/i,
};

// De twee toezeggingen uit de beslissing van 2026-08-22.
const EIGENDOM: Record<Locale, RegExp> = {
  en: /yours/i,
  nl: /van jou/i,
  de: /gehört Ihnen/i,
  es: /es tuyo/i,
};
const VERREKENING: Record<Locale, RegExp> = {
  en: /comes off it in full/i,
  nl: /volledig vanaf/i,
  de: /vollständig angerechnet/i,
  es: /se descuenta íntegro/i,
};

const WORTEL = join(__dirname, "..", "..");

// Elk bedrag-achtig teken: "€2.500", "2.500 €", "€ 2,500".
// Moet op een cijfer eindigen, anders eet [\d.,]* de punt aan het eind van
// de zin op, en leest "€2,500." als een ander bedrag dan "€2,500".
const BEDRAGEN = /(?:€\s?\d(?:[\d.,]*\d)?|\d(?:[\d.,]*\d)?\s?€)/g;

// De sprintprijs komt uit docs/claims.md en nergens anders vandaan. Bewust
// geparst en niet overgeschreven: een tweede kopie van dit getal in dit bestand
// is precies de bugklasse die claims.md bestaat om te voorkomen. Breekt de rij,
// dan valt deze poort luid om in plaats van een verouderd getal te bewaken.
function sprintprijsUitClaims(): number {
  const claims = readFileSync(join(WORTEL, "docs", "claims.md"), "utf8");
  const m = claims.match(/\|\s*vaste prijs sprint\s*\|\s*\*\*€([\d.]+)\*\*/);
  if (!m) {
    throw new Error(
      "docs/claims.md draagt geen rij `| vaste prijs sprint | **€…** |` meer, " +
        "terwijl de site een bedrag publiceert. Herstel de rij of haal het bedrag uit de kopij.",
    );
  }
  return Number(m[1].replace(/\./g, ""));
}

// Opmaak per taal, gelijk aan wat pricing.migration.title al deed: het teken
// staat in het Duits en Spaans achter het getal.
function opmaak(bedrag: number, l: Locale): string {
  const punt = new Intl.NumberFormat("nl-NL").format(bedrag);
  const komma = new Intl.NumberFormat("en-US").format(bedrag);
  if (l === "en") return `€${komma}`;
  if (l === "nl") return `€${punt}`;
  return `${punt} €`;
}

// De btw-grondslag hoort naast elk bedrag, in de vorm die in die taal gangbaar
// is. Het Duits gebruikt bewust niet "excl.", want dat is geen Duits; `zzgl.`
// is de zakelijke standaardafkorting. Beslist 2026-08-22, zie docs/claims.md.
const BTW: Record<Locale, string> = {
  en: "excl. VAT",
  nl: "excl. btw",
  de: "zzgl. MwSt.",
  es: "más IVA",
};

describe("wat de diagnosesprint belooft", () => {
  it("elk antwoord dat de sprint noemt, noemt ook wat hij oplevert", () => {
    let gezien = 0;
    for (const [naam, set] of Object.entries(FAQ_SETS)) {
      for (const l of LOCALES) {
        for (const { q, a } of set[l]) {
          if (!NOEMT_SPRINT[l].test(a)) continue;
          gezien++;
          expect(
            NOEMT_DELIVERABLE[l].test(a),
            `${naam}-FAQ (${l}) noemt de sprint van 30 dagen maar niet wat hij ` +
              `oplevert — vraag: "${q}"`,
          ).toBe(true);
        }
      }
    }
    // Positieve controle. Zonder deze slaagt de lus ook wanneer NOEMT_SPRINT
    // door een hernoeming nergens meer op matcht, en dan bewaakt hij niets.
    expect(gezien, "geen enkel FAQ-antwoord noemt de sprint — is de regex stuk?").toBe(8);
  });

  it("de ladder noemt de deliverable en beide toezeggingen, in vier talen", () => {
    for (const l of LOCALES) {
      const body = DICT[l]["services.how.s2.body"];
      const note = DICT[l]["services.how.s2.note"];
      expect(body, `services.how.s2.body ontbreekt voor ${l}`).toBeTruthy();
      expect(note, `services.how.s2.note ontbreekt voor ${l}`).toBeTruthy();
      expect(
        NOEMT_DELIVERABLE[l].test(body),
        `services.how.s2.body (${l}) noemt het bouwplan niet: "${body}"`,
      ).toBe(true);
      expect(
        EIGENDOM[l].test(note),
        `services.how.s2.note (${l}) zegt niet dat het plan van de klant blijft: "${note}"`,
      ).toBe(true);
      expect(
        VERREKENING[l].test(note),
        `services.how.s2.note (${l}) noemt de verrekening niet: "${note}"`,
      ).toBe(true);
    }
  });

  it("het bedrag komt uit docs/claims.md, in de opmaak van elke taal", () => {
    const prijs = sprintprijsUitClaims();
    expect(prijs, "claims.md levert geen bruikbaar getal").toBeGreaterThan(0);

    // Eerst de meetlatten zelf. Een lege overtreedslijst uit een kapotte regex
    // of een stille opmaakfout leest hetzelfde als een schone meting.
    expect(opmaak(2500, "en")).toBe("€2,500");
    expect(opmaak(2500, "nl")).toBe("€2.500");
    expect(opmaak(2500, "de")).toBe("2.500 €");
    expect(opmaak(2500, "es")).toBe("2.500 €");
    expect(`${opmaak(2500, "de")} ${BTW.de}`).toBe("2.500 € zzgl. MwSt.");
    expect("kost €2.500 per traject".match(BEDRAGEN)).toEqual(["€2.500"]);
    expect("kostet 2.500 € pro Sprint".match(BEDRAGEN)).toEqual(["2.500 €"]);
    expect("kost €2,500. Dat is het.".match(BEDRAGEN)).toEqual(["€2,500"]);
    expect("dertig dagen, geen bedrag".match(BEDRAGEN)).toBe(null);

    for (const l of LOCALES) {
      const verwacht = opmaak(prijs, l);
      const kaal = (s: string) => s.replace(/\s/g, "");

      const metBtw = `${verwacht} ${BTW[l]}`;
      const titel = DICT[l]["services.how.s2.title"];
      expect(
        titel.includes(metBtw),
        `services.how.s2.title (${l}) noemt niet "${metBtw}": "${titel}"`,
      ).toBe(true);

      let gezien = 0;
      for (const [naam, set] of Object.entries(FAQ_SETS)) {
        for (const { q, a } of set[l]) {
          if (!NOEMT_SPRINT[l].test(a)) continue;
          const gevonden = a.match(BEDRAGEN) ?? [];
          expect(
            gevonden.length,
            `${naam}-FAQ (${l}) noemt de sprint van 30 dagen maar geen bedrag, ` +
              `terwijl de prijs beslist is — vraag: "${q}"`,
          ).toBeGreaterThan(0);
          for (const b of gevonden) {
            expect(
              kaal(b),
              `${naam}-FAQ (${l}) noemt ${b} terwijl docs/claims.md ${verwacht} ` +
                `zegt — vraag: "${q}"`,
            ).toBe(kaal(verwacht));
          }
          expect(
            a.includes(metBtw),
            `${naam}-FAQ (${l}) noemt een bedrag zonder de btw-grondslag ` +
              `"${BTW[l]}" ernaast — vraag: "${q}"`,
          ).toBe(true);
          gezien += gevonden.length;
        }
      }
      expect(gezien, `geen enkel FAQ-antwoord noemt het bedrag voor ${l}`).toBeGreaterThan(0);
    }
  });


  // ── Geen garantie op de uitkomst ────────────────────────────────────────
  //
  // Beslist 2026-08-22 (docs/claims.md, "Garantie en capaciteit"): het aanbod
  // draagt risico-omkering op de LEVERING — het bouwplan blijft van de klant,
  // de sprintprijs gaat van de bouw af — en belooft daarbovenop géén
  // resultaat. Op de dag van de beslissing stond er ook niets: nul treffers in
  // vier talen. Deze poort houdt het zo.
  //
  // De scan gaat over het hele woordenboek en niet alleen over de sprintkopij,
  // want een resultaatbelofte hoort nergens op deze site. `pricing.*` is de
  // enige uitzondering: dat is DEUS, een ander product met zijn eigen
  // toezeggingen, en het venster van 30 dagen daar is opzet.
  // Termen als lijst en niet als één handgeschreven regex, zodat elke term
  // afzonderlijk bewezen kan worden. De mutatietest liet zien waarom: een
  // alternatief uit een lange regex halen bleef onopgemerkt, omdat de
  // positieve controles alleen de terugbetaal-helft raakten. Nu eist de poort
  // dat élke term aantoonbaar afgaat.
  const TERMEN: ReadonlyArray<{ term: string; bewijs: string; taal: Locale }> = [
    { term: "guarantee", bewijs: "results guarantee", taal: "en" },
    { term: "money.?back", bewijs: "money-back offer", taal: "en" },
    { term: "refund", bewijs: "30-day refund window", taal: "en" },
    { term: "no.cure.no.pay", bewijs: "no cure no pay", taal: "en" },
    { term: "garantie", bewijs: "wij geven garantie", taal: "nl" },
    { term: "gegarandeerd", bewijs: "resultaat gegarandeerd", taal: "nl" },
    { term: "geld terug", bewijs: "anders geld terug", taal: "nl" },
    { term: "terugbetaling", bewijs: "30 dagen terugbetalingsvenster", taal: "nl" },
    { term: "garantiert", bewijs: "Ergebnis garantiert", taal: "de" },
    { term: "Geld zur(ü|u)ck", bewijs: "sonst Geld zurück", taal: "de" },
    { term: "(R|r)ückerstattung", bewijs: "30-Tage-Rückerstattungsfenster", taal: "de" },
    { term: "Erstattung", bewijs: "volle Erstattung", taal: "de" },
    { term: "garant(í|i)a", bewijs: "garantía de resultado", taal: "es" },
    { term: "garantizad", bewijs: "resultado garantizado", taal: "es" },
    { term: "reembolso", bewijs: "ventana de reembolso de 30 días", taal: "es" },
    { term: "devoluci(ó|o)n", bewijs: "devolución del importe", taal: "es" },
  ];
  const GARANTIETAAL = new RegExp(TERMEN.map((t) => t.term).join("|"), "i");
  // Sleutels die bewust buiten de scan vallen, met reden én aantal. Een
  // aantal, want anders lift een tweede, échte belofte onder hetzelfde
  // voorvoegsel stilzwijgend mee.
  const BUITEN_SCAN: ReadonlyArray<{ voorvoegsel: string; aantal: number; reden: string }> = [
    {
      voorvoegsel: "pricing.",
      aantal: 1,
      reden:
        "DEUS-abonnement, ander product: pricing.faq.a3 noemt bewust een " +
        "terugbetaalvenster van 30 dagen op een jaarcontract",
    },
  ];

  it("geen enkele plek in kopij belooft een resultaat", () => {
    // Eerst de meetlat. Een lege overtreedslijst uit een kapot patroon leest
    // hetzelfde als een schone meting, dus de uitzondering doet hier dubbel
    // werk: hij is tegelijk de positieve controle.
    for (const { term, bewijs } of TERMEN) {
      expect(
        new RegExp(term, "i").test(bewijs),
        `term "${term}" gaat niet af op zijn eigen bewijs "${bewijs}" — de term is stuk`,
      ).toBe(true);
      expect(
        GARANTIETAAL.test(bewijs),
        `"${bewijs}" komt niet door GARANTIETAAL — term "${term}" is uit het patroon verdwenen`,
      ).toBe(true);
    }
    expect(
      GARANTIETAAL.test("een bouwplan met een getal per fase"),
      "patroon gaat af op gewone kopij",
    ).toBe(false);

    // Geen enkele test kan zien dat iemand een controle weghaalt die hij niet
    // verwacht. Vandaar een vastgelegde inventaris: een term schrappen wordt
    // daarmee een zichtbare bewerking in plaats van stille dekkingsverlies.
    expect(
      TERMEN.length,
      "de termenlijst is gewijzigd — schrap je bewust een term, pas dan dit getal aan",
    ).toBe(16);
    for (const l of LOCALES) {
      expect(
        TERMEN.filter((t) => t.taal === l).length,
        `taal ${l} houdt te weinig termen over om een resultaatbelofte te vangen`,
      ).toBeGreaterThanOrEqual(4);
    }

    for (const { voorvoegsel, aantal, reden } of BUITEN_SCAN) {
      for (const l of LOCALES) {
        const treffers = Object.entries(DICT[l]).filter(
          ([k, v]) => k.startsWith(voorvoegsel) && GARANTIETAAL.test(v),
        );
        expect(
          treffers.length,
          `uitzondering "${voorvoegsel}" (${l}) staat op ${aantal} — gevonden ` +
            `${treffers.length}: ${treffers.map(([k]) => k).join(", ")}. Reden: ${reden}. ` +
            `Is dit een nieuwe belofte, beslis hem dan eerst in docs/claims.md.`,
        ).toBe(aantal);
      }
    }

    for (const l of LOCALES) {
      const overtreders = Object.entries(DICT[l]).filter(
        ([k, v]) =>
          !BUITEN_SCAN.some(({ voorvoegsel }) => k.startsWith(voorvoegsel)) &&
          GARANTIETAAL.test(v),
      );
      expect(
        overtreders.map(([k]) => k),
        `kopij (${l}) belooft een resultaat, terwijl docs/claims.md vastlegt dat ` +
          `dit aanbod géén uitkomstgarantie draagt`,
      ).toEqual([]);
    }

    for (const [naam, set] of Object.entries(FAQ_SETS)) {
      for (const l of LOCALES) {
        for (const { q, a } of set[l]) {
          expect(
            GARANTIETAAL.test(a),
            `${naam}-FAQ (${l}) belooft een resultaat — vraag: "${q}"`,
          ).toBe(false);
        }
      }
    }
  });

  // De kopij mag zijn bron niet overleven. Zelfde vorm als
  // components/sections/ResultsStrip.test.ts: daar bleef de homepage vier
  // cijfers publiceren terwijl claims.md ontkende dat ze bestonden.
  it("docs/claims.md draagt de beslissing waar deze kopij op leunt", () => {
    const claims = readFileSync(join(WORTEL, "docs", "claims.md"), "utf8");
    expect(
      claims.includes("Wat de diagnosesprint oplevert"),
      "docs/claims.md kent de beslissing niet meer, terwijl de site hem wel publiceert",
    ).toBe(true);
    expect(
      claims.includes("Garantie en capaciteit"),
      "docs/claims.md kent de garantie- en capaciteitsbeslissing niet meer",
    ).toBe(true);
    for (const woord of [
      "het eerste onderdeel dat al draait",
      "volledig van de klant",
      "garantie op de **uitkomst** | **geen**",
      "trajecten tegelijk | **drie**",
    ]) {
      expect(
        claims.includes(woord),
        `docs/claims.md legt "${woord}" niet vast terwijl de kopij het belooft`,
      ).toBe(true);
    }
  });
});
