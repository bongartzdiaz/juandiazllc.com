import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENKELE_TAAL, localesVoor } from "./enkele-taal";
import { LOCALES, type Locale } from "./dict";
import sitemap from "@/app/sitemap";

/* Gate op het begrip "bestaat maar in één taal".
 *
 * metadata-locales.test.ts slaat deze routes over — hij eist normaal dat titel
 * en beschrijving per taal verschillen, en dat kan niet bij een pagina die in
 * de andere drie talen 404't. Die uitzondering mag alleen bestaan zolang hier
 * strengere eisen tegenover staan, anders is ENKELE_TAAL een achterdeur om een
 * onvertaalde vierstalige pagina te verstoppen.
 *
 * Drie eisen: de pagina bestaat, hij 404't werkelijk buiten zijn taal, en de
 * sitemap zegt precies hetzelfde. Die laatste is de reden dat ENKELE_TAAL
 * überhaupt bestaat — zonder gedeelde bron zijn het twee lijsten die niets
 * synchroon houdt, en dat is de bugklasse die deze repo het vaakst raakt. */

const WORTEL = join(__dirname, "..", "..");

describe("ENKELE_TAAL", () => {
  it("is niet leeg en noemt per route een reden", () => {
    const paden = Object.keys(ENKELE_TAAL);
    expect(paden.length).toBeGreaterThan(0);
    for (const pad of paden) {
      expect(pad.startsWith("/"), `${pad} mist de leidende slash`).toBe(true);
      expect(ENKELE_TAAL[pad].reden.length, `${pad} heeft geen reden`).toBeGreaterThan(60);
      expect(ENKELE_TAAL[pad].locales.length, `${pad} noemt geen talen`).toBeGreaterThan(0);
      for (const l of ENKELE_TAAL[pad].locales) {
        expect(LOCALES).toContain(l);
      }
    }
  });

  it("beschrijft een route die minder talen draagt dan alle vier", () => {
    // Een entry met alle vier de talen zou de metadata-gate uitschakelen zonder
    // iets te beperken. Dat is precies de achterdeur.
    for (const [pad, { locales }] of Object.entries(ENKELE_TAAL)) {
      expect(locales.length, `${pad} noemt alle talen en beperkt dus niets`).toBeLessThan(
        LOCALES.length,
      );
    }
  });

  it("wijst naar een pagina die bestaat", () => {
    for (const pad of Object.keys(ENKELE_TAAL)) {
      const bestand = join(WORTEL, "app", "[locale]", ...pad.split("/").filter(Boolean), "page.tsx");
      expect(existsSync(bestand), `geen page.tsx voor ${pad}`).toBe(true);
    }
  });

  /* De harde eis. Zonder 404-poort serveert /en, /de en /es dezelfde
   * Nederlandse pagina onder een Engelse hreflang: dunne inhoud met een
   * verkeerd taalsignaal. */
  it("wijst naar een pagina die buiten zijn taal 404't", () => {
    for (const pad of Object.keys(ENKELE_TAAL)) {
      const bestand = join(WORTEL, "app", "[locale]", ...pad.split("/").filter(Boolean), "page.tsx");
      const bron = readFileSync(bestand, "utf8");
      expect(bron.includes("notFound"), `${pad} roept notFound() niet aan`).toBe(true);
      expect(bron.includes("ENKELE_TAAL"), `${pad} leest zijn talen niet uit ENKELE_TAAL`).toBe(true);
    }
  });

  it("levert via localesVoor() alle talen voor een onbekend pad", () => {
    expect(localesVoor("/bestaat-niet", LOCALES)).toEqual([...LOCALES]);
    for (const [pad, { locales }] of Object.entries(ENKELE_TAAL)) {
      expect(localesVoor(pad, LOCALES)).toEqual(locales);
    }
  });
});

describe("de sitemap zegt hetzelfde", () => {
  const urls = sitemap().map((e) => e.url);

  it("bevat überhaupt URL's", () => {
    // Anders slaagt elke telling hieronder op een lege lijst.
    expect(urls.length).toBeGreaterThan(50);
  });

  for (const [pad, { locales }] of Object.entries(ENKELE_TAAL)) {
    it(`emit ${pad} alleen voor ${locales.join(", ")}`, () => {
      const gevonden = LOCALES.filter((l: Locale) => urls.some((u) => u.endsWith(`/${l}${pad}`)));
      expect(gevonden).toEqual(locales);
    });
  }
});
