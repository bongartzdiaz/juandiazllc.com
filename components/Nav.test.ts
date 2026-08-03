import { describe, it, expect } from "vitest";
import { NAV_LINKS } from "./Nav";
import { DICT, LOCALES } from "@/lib/i18n/dict";
import { localeHref } from "@/lib/i18n/href";

/* De vitest-omgeving hier is `node`, zonder jsdom of testing-library, dus het
 * gedrag van het paneel — openen, Escape, focusval, sluiten bij navigatie —
 * is in de browserpreview geverifieerd en niet hier. Wat hier wél te bewaken
 * valt is de linklijst zelf, en dat is precies waar het misging: zes van de
 * negen links waren onder 860px onbereikbaar. */

describe("NAV_LINKS", () => {
  it("bevat de zes links die onder 860px onbereikbaar waren", () => {
    const hrefs = NAV_LINKS.map((l) => l.href);
    for (const pad of ["/about", "/story", "/services", "/sectors", "/insights", "/signals"]) {
      expect(hrefs, `${pad} ontbreekt`).toContain(pad);
    }
  });

  it("heeft geen dubbele paden", () => {
    const hrefs = NAV_LINKS.map((l) => l.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  // Ze gaan door LocaleLink, dus ze horen zelf taalloos te zijn. Een pad dat
  // de prefix al draagt zou in één taal vastgeroest zitten.
  it("elk pad is taalloos en krijgt de prefix van LocaleLink", () => {
    for (const l of NAV_LINKS) {
      expect(l.href.startsWith("/"), l.href).toBe(true);
      expect(localeHref("nl", l.href), l.href).toBe(`/nl${l.href}`);
    }
  });

  // Rechtstreeks op DICT: translate() valt terug op het Engels, dus een
  // ontbrekende Duitse sleutel zou daar gewoon de Engelse waarde opleveren en
  // de test zou slagen.
  it("elk label staat in alle vier de woordenboeken", () => {
    for (const l of NAV_LINKS) {
      for (const taal of LOCALES) {
        expect(Object.hasOwn(DICT[taal], l.sleutel), `${l.sleutel} ontbreekt in ${taal}`).toBe(true);
        expect(DICT[taal][l.sleutel]?.trim(), `${l.sleutel} is leeg in ${taal}`).toBeTruthy();
      }
    }
  });
});

describe("de knoplabels van het menu", () => {
  for (const sleutel of ["nav.aria.menuOpen", "nav.aria.menuClose"]) {
    it(`${sleutel} staat in alle vier de woordenboeken`, () => {
      for (const taal of LOCALES) {
        expect(Object.hasOwn(DICT[taal], sleutel), `ontbreekt in ${taal}`).toBe(true);
        expect(DICT[taal][sleutel]?.trim(), `leeg in ${taal}`).toBeTruthy();
      }
    });
  }

  it("openen en sluiten hebben per taal een verschillend label", () => {
    for (const taal of LOCALES) {
      expect(DICT[taal]["nav.aria.menuOpen"], taal).not.toBe(DICT[taal]["nav.aria.menuClose"]);
    }
  });
});
