import { describe, it, expect } from "vitest";
import { LOCALES } from "@/lib/i18n/dict";
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
