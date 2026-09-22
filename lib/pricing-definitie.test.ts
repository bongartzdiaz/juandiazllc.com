import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES } from "./i18n/dict";

/* Poort: de definitiezin op /pricing noemt het product, de maker en de
 * getallen die de CSV draagt — in alle vier de talen.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Gemeten 2026-09-22 op Perplexity, zonder login: "What is DEUS CRM
 * by Juan Diaz LLC and what does it cost per seat?" gaf "I can't find any
 * reliable information about a DEUS CRM by Juan Diaz LLC or its per-seat
 * pricing". Dezelfde assistent vatte een minuut eerder /about correct samen.
 * Het verschil: /about opent met een zin die zegt wie Juan is; /pricing opende
 * met "Four tiers. One promise." en een lede die het product niet noemt. Een
 * assistent haalt één zelfstandige alinea op, geen pagina.
 *
 * WAT DEZE POORT BEWAAKT. `pricing.definitie` is die alinea. Hij moet in elke
 * taal het product (DEUS), de soort (CRM), de maker (Juan Diaz) en de twee
 * getallen dragen die de CSV vastlegt: de instapprijs per seat en de lengte
 * van de proefperiode. De getallen worden uit de bron gelezen, niet
 * overgeschreven — verandert de CSV, dan valt dit om in plaats van stil een
 * oude prijs te bewaken. En de pagina moet de zin ook werkelijk als eerste
 * alinea tonen en als Product-description in het schema zetten. */

const WORTEL = join(__dirname, "..");
const PAGINA = readFileSync(join(WORTEL, "app", "[locale]", "pricing", "page.tsx"), "utf8");
const CSV = readFileSync(join(WORTEL, "_drafts", "pricing", "pricing-tiers.csv"), "utf8");

function starterMaandprijs(): string {
  const blok = PAGINA.split("// <BEGIN GENERATED:TIERS>")[1]?.split("// <END GENERATED:TIERS>")[0] ?? "";
  const m = blok.match(/key:\s*"starter",\s*monthlyPrice:\s*"€(\d+)"/);
  if (!m) throw new Error("TIERS-blok in page.tsx draagt geen Starter-maandprijs");
  return m[1];
}

function proefdagen(): string {
  const rij = CSV.split(/\r?\n/).find((r) => r.startsWith("Pricing,Free trial"));
  const m = rij?.match(/,(\d+) days,/);
  if (!m) throw new Error("CSV draagt geen `Free trial`-rij met een dagental");
  return m[1];
}

describe("pricing.definitie", () => {
  const prijs = starterMaandprijs();
  const dagen = proefdagen();

  it("leest de getallen uit de bron (positieve controle)", () => {
    expect(prijs).toMatch(/^\d+$/);
    expect(dagen).toMatch(/^\d+$/);
  });

  for (const l of LOCALES) {
    it(`${l}: noemt DEUS, CRM, Juan Diaz, €${prijs} en ${dagen} dagen`, () => {
      const zin = DICT[l]["pricing.definitie"];
      expect(zin, `pricing.definitie ontbreekt in ${l}`).toBeTruthy();
      expect(zin).toMatch(/\bDEUS\b/);
      expect(zin).toMatch(/\bCRM\b/);
      expect(zin).toContain("Juan Diaz");
      // €40 (en/nl) of 40 € (de/es): het getal moet er als prijs in staan.
      expect(zin).toMatch(new RegExp(`€\\s?${prijs}\\b|\\b${prijs}\\s?€`));
      expect(zin).toMatch(new RegExp(`\\b${dagen}\\b`));
      // Eén alinea, geen opsomming: een assistent citeert een zin, geen lijst.
      expect(zin).not.toContain("\n");
      expect(zin.length).toBeLessThan(260);
    });
  }

  it("staat als eerste alinea onder de H1, vóór de lede", () => {
    const def = PAGINA.indexOf('<p>{t("pricing.definitie")}</p>');
    const lede = PAGINA.indexOf('<p>{t("pricing.lede")}</p>');
    expect(def).toBeGreaterThan(-1);
    expect(lede).toBeGreaterThan(def);
  });

  it("is de description van het Product-schema", () => {
    expect(PAGINA).toContain('productDescription: t("pricing.definitie")');
  });
});
