import { describe, it, expect } from "vitest";
import {  } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES } from "./i18n/dict";
import { ZUSTERMERK_NAAM, ZUSTERMERK_URL, ZUSTERMERK_ID, AFFILIATIE_URL } from "./seo/branding";
import { leesBron } from "@/lib/bronscan";

/* Poort: het paar juandiazllc.com ↔ diazatlas.com blijft wederzijds, en blijft
 * één redactionele plek.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Gemeten 2026-09-22 met `scripts/backlink-inventory.sh`: geen van
 * de acht sites van Juan linkte naar juandiazllc.com. `diaz-editor#687` heeft
 * de ene helft gelegd — de vier about-pagina's van diazatlas.com linken
 * "Juan Diaz LLC" hierheen en hun `founder` draagt een `sameAs` naar het
 * Person-knooppunt hier. Deze kant was de andere helft.
 *
 * WAT DEZE POORT BEWAAKT, en waarom elk punt:
 *
 *   1. De zichtbare link staat op /about en nergens anders. Eén redactionele
 *      plek per site is de regel uit `docs/backlink-strategie.md` §1: acht
 *      eigen domeinen die allemaal sitebreed naar hetzelfde adres wijzen,
 *      lezen voor een zoekmachine als een netwerk in plaats van als een
 *      auteur die zijn eigen werk ondertekent.
 *   2. Het Organization-schema draagt het merk in `brand`, met de `@id` van
 *      het knooppunt dáár. Niet `sameAs` (dat zou beweren dat diazatlas.com
 *      dit bedrijf beschrijft) en niet `subOrganization` (een organisatie-
 *      eenheid verzinnen bij een LLC van één persoon).
 *   3. De drie kopijsleutels bestaan in alle vier de talen en noemen de naam.
 *      Ontbreekt er een, dan valt `translate()` stil terug op Engels — zie
 *      [[feedback_assert_niet_door_het_vangnet]].
 *
 * Wat deze poort NIET kan zien: of de tegenrichting nog staat. Dat is een
 * ander domein en komt nooit langs een pull request hier; daarvoor is
 * `scripts/backlink-inventory.sh` (handmatig) en `controleerEntiteitsAdressen`
 * in de dagelijkse productie-audit, die merkt dat het adres zelf verdwijnt. */

const WORTEL = join(__dirname, "..");
const ABOUT = leesBron(join(WORTEL, "app", "[locale]", "about", "page.tsx"));
const LAYOUT = leesBron(join(WORTEL, "app", "layout.tsx"));

/** Elk bestand onder app/ en components/ dat de hostnaam letterlijk draagt. */
function bestandenMetHost(): string[] {
  const host = new URL(ZUSTERMERK_URL).hostname;
  const uit: string[] = [];
  const stapel = [join(WORTEL, "app"), join(WORTEL, "components")];
  // Synchroon en zonder afhankelijkheden: dit draait in een test, niet in een
  // hete lus.
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  while (stapel.length) {
    const map = stapel.pop()!;
    for (const naam of readdirSync(map)) {
      const pad = join(map, naam);
      if (statSync(pad).isDirectory()) {
        stapel.push(pad);
        continue;
      }
      if (!/\.(tsx?|mdx?)$/.test(naam) || naam.includes(".test.")) continue;
      if (leesBron(pad).includes(host)) uit.push(pad.slice(WORTEL.length + 1).replace(/\\/g, "/"));
    }
  }
  return uit.sort();
}

describe("het zustermerk", () => {
  it("heeft een extern, canoniek adres", () => {
    expect(ZUSTERMERK_URL).toMatch(/^https:\/\/[a-z0-9.-]+$/);
    expect(ZUSTERMERK_URL.endsWith("/")).toBe(false);
    expect(new URL(ZUSTERMERK_URL).hostname).not.toContain("juandiazllc.com");
    expect(ZUSTERMERK_URL).not.toBe(AFFILIATIE_URL);
    expect(ZUSTERMERK_ID).toBe(`${ZUSTERMERK_URL}#organization`);
  });

  it("staat als zichtbare link op /about, en alleen daar", () => {
    expect(ABOUT).toContain("href={ZUSTERMERK_URL}");
    // layout.tsx mag de host dragen (het schema), pagina's niet — behalve
    // /about. Een tweede pagina met deze link is het begin van een voetlink.
    const dragers = bestandenMetHost().filter((p) => !p.endsWith("app/layout.tsx"));
    expect(dragers, "alleen /about mag de zichtbare link dragen").toEqual([
      "app/[locale]/about/page.tsx",
    ]);
  });

  it("zit in het Organization-schema als `brand`, met de @id van dat knooppunt", () => {
    expect(LAYOUT).toContain("brand: {");
    expect(LAYOUT).toContain('"@id": ZUSTERMERK_ID');
    expect(LAYOUT).toContain("url: ZUSTERMERK_URL");
    // Twee verkeerde velden, expliciet uitgesloten: zie de kop.
    expect(LAYOUT).not.toContain("subOrganization");
    expect(LAYOUT).not.toMatch(/sameAs:\s*\[[^\]]*diazatlas/);
  });

  for (const l of LOCALES) {
    it(`${l}: de drie kopijsleutels bestaan en noemen de naam`, () => {
      const t = DICT[l];
      for (const k of ["about.p.atlas.1", "about.p.atlas.link", "about.p.atlas.2"] as const) {
        expect(t[k], `${k} ontbreekt in ${l}`).toBeTruthy();
      }
      expect(t["about.p.atlas.link"]).toBe(ZUSTERMERK_NAAM);
      // De link mag niet de hele zin zijn: de ankertekst is de merknaam.
      expect(t["about.p.atlas.1"].length + t["about.p.atlas.2"].length).toBeGreaterThan(
        t["about.p.atlas.link"].length,
      );
    });
  }
});
