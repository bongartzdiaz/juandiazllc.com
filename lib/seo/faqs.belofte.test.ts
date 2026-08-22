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

// Een bedrag in welke vorm dan ook.
const BEDRAG = /(?:€|\$|\bEUR\b)\s?\d|\d[\d.,]*\s?(?:euro|EUR|€)/i;

const WORTEL = join(__dirname, "..", "..");

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

  it("nergens een bedrag, want de prijs is nog niet beslist", () => {
    // Eerst bewijzen dat de meetlat werkt. Een lege overtreedslijst uit een
    // kapotte regex leest hetzelfde als een schone meting.
    for (const proef of ["vanaf €2.500", "$2,500 flat", "2500 euro", "EUR 2500"]) {
      expect(BEDRAG.test(proef), `BEDRAG matcht "${proef}" niet`).toBe(true);
    }
    expect(BEDRAG.test("een vaste prijs, 30 dagen"), "BEDRAG matcht te breed").toBe(false);

    for (const l of LOCALES) {
      for (const sleutel of ["services.how.s2.body", "services.how.s2.note"] as const) {
        const v = DICT[l][sleutel];
        expect(BEDRAG.test(v), `${sleutel} (${l}) draagt een bedrag: "${v}"`).toBe(false);
      }
    }
    for (const [naam, set] of Object.entries(FAQ_SETS)) {
      for (const l of LOCALES) {
        for (const { q, a } of set[l]) {
          if (!NOEMT_SPRINT[l].test(a)) continue;
          expect(
            BEDRAG.test(a),
            `${naam}-FAQ (${l}) noemt een bedrag voor de sprint terwijl die prijs ` +
              `nog niet in docs/claims.md staat — vraag: "${q}"`,
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
    for (const woord of ["het eerste onderdeel dat al draait", "volledig van de klant"]) {
      expect(
        claims.includes(woord),
        `docs/claims.md legt "${woord}" niet vast terwijl de kopij het belooft`,
      ).toBe(true);
    }
  });
});
