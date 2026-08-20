import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/* Poort: het resultatenblok mag alleen op een pagina staan als elk cijfer dat
 * het publiceert in docs/claims.md is terug te vinden.
 *
 * Aanleiding. Van 2026-04-18 tot 2026-08-19 stond op de homepage, in vier
 * talen, "+38%", "3.2x", "−61%" en "€0", elk met sector, tijdvenster en een
 * zin context. Geen van de vier stond in claims.md — dat bestand hield op
 * regel 289 juist het tegendeel bij: "Client results, revenue figures,
 * testimonials — none exist; do not imply any."
 *
 * Waarom een poort en niet oplettendheid. Het component droeg zijn eigen regel
 * al in de kop ("Never invent a number... delete the card rather than fudge
 * it") en claims.md droeg regel 1 ("A number appears here or it does not get
 * published"). Twee geschreven regels, vier maanden live, niemand die het zag.
 * Een regel die alleen in commentaar staat is geen regel.
 *
 * De poort leest de bestanden als tekst, niet de module. Wat we bewaken is wat
 * de geserveerde pagina bevat, niet wat een module toevallig exporteert. */

const WORTEL = join(__dirname, "..", "..");
const COMPONENT = join(WORTEL, "components", "sections", "ResultsStrip.tsx");
const CLAIMS = join(WORTEL, "docs", "claims.md");

/** De cijfers zoals de bezoeker ze ziet: metric + unit aan elkaar. */
function gepubliceerdeCijfers(bron: string): string[] {
  const uit: string[] = [];
  const re = /metric:\s*"([^"]+)"(?:\s*,\s*unit:\s*"([^"]+)")?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bron)) !== null) uit.push(`${m[1]}${m[2] ?? ""}`);
  return uit;
}

/* claims.md is groot en bevat ook Diaz Editor-bedragen. Een cijfer moet in het
 * juandiazllc.com-deel staan, anders zou "€0" ergens in een prijstabel de poort
 * al tevredenstellen. */
function juandiazRegio(md: string): string {
  const start = md.indexOf("\n## juandiazllc.com");
  if (start === -1) return "";
  const regels = md.slice(start + 1).split("\n");
  const uit: string[] = [];
  for (const [i, r] of regels.entries()) {
    if (i > 0 && r.startsWith("## ") && !r.startsWith("## juandiazllc.com")) break;
    uit.push(r);
  }
  return uit.join("\n");
}

function tsxBestanden(map: string): string[] {
  const uit: string[] = [];
  for (const naam of readdirSync(map)) {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) {
      if (naam === "node_modules") continue;
      uit.push(...tsxBestanden(pad));
    } else if (naam.endsWith(".tsx")) {
      uit.push(pad);
    }
  }
  return uit;
}

const PAGINAS = tsxBestanden(join(WORTEL, "app"))
  .map((p) => relative(WORTEL, p).split(sep).join("/"))
  .sort();

/* Op de naam matchen zou ook het commentaar raken dat uitlegt waaróm het blok
 * er niet staat. Alleen een echte JSX-montage telt. */
const GEMONTEERD = PAGINAS.filter((p) => /<ResultsStrip[\s/>]/.test(readFileSync(join(WORTEL, p), "utf8")));

const CIJFERS = gepubliceerdeCijfers(readFileSync(COMPONENT, "utf8"));
const REGIO = juandiazRegio(readFileSync(CLAIMS, "utf8"));

describe("resultatenblok publiceert geen cijfer zonder bron", () => {
  /* Zonder deze drie zou een verplaatst bestand of een hernoemd veld de poort
   * stilzwijgend op een lege lijst laten slagen — precies de fout uit
   * feedback_assert_niet_door_het_vangnet. */
  it("vindt de cijfers daadwerkelijk in het component", () => {
    expect(CIJFERS.length, "geen enkel metric-veld gevonden in ResultsStrip.tsx").toBeGreaterThanOrEqual(3);
    for (const c of CIJFERS) expect(c.trim()).not.toBe("");
  });

  it("vindt het juandiazllc.com-deel van claims.md", () => {
    expect(REGIO, "kop '## juandiazllc.com' niet gevonden in docs/claims.md").toContain("juandiazllc.com");
    expect(REGIO.length).toBeGreaterThan(200);
  });

  it("scant daadwerkelijk de pagina's", () => {
    expect(PAGINAS).toContain("app/[locale]/page.tsx");
  });

  it("staat op de pagina's waar de beslissing valt, en nergens anders", () => {
    /* Tot 2026-08-20 stond dit blok alleen op de homepage, terwijl /services
     * en /contact samen nul cijfers droegen — de twee pagina's waar iemand
     * besluit of hij een gesprek boekt. Het sterkste bezit van deze site lag
     * als decoratie op de pagina waar niemand koopt.
     *
     * De lijst staat hier expliciet en niet impliciet, omdat "alleen op de
     * homepage" ook nooit als besluit is genomen — het was gewoon de plek waar
     * het blok geboren werd, en daarna heeft niemand er meer naar gekeken.
     * Verplaatst iemand het, dan valt deze poort om en is de verplaatsing een
     * keuze in plaats van een verschuiving. */
    const HOORT_TE_STAAN: Record<string, string> = {
      "app/[locale]/page.tsx": "homepage — staat waar een logowall met quotes zou staan",
      "app/[locale]/services/page.tsx": "tussen de ladder en de CTA: eerst de stappen, dan het bewijs, dan de vraag",
      "app/[locale]/contact/page.tsx": "onder het formulier, voor wie twijfelt en eraan voorbij scrollt",
    };

    const verwacht = Object.keys(HOORT_TE_STAAN).sort();
    const ontbreekt = verwacht.filter((p) => !GEMONTEERD.includes(p));
    const onverwacht = GEMONTEERD.filter((p) => !verwacht.includes(p));

    expect(
      ontbreekt,
      "Het blok is van deze pagina('s) verdwenen. Dat mag, maar dan hoort de " +
        "reden hier weg te vallen in plaats van de montage stil te verdwijnen.",
    ).toEqual([]);
    expect(
      onverwacht,
      "Het blok staat op een pagina die hier niet genoemd wordt. Zet hem in " +
        "HOORT_TE_STAAN met een reden, zodat de volgende lezer weet waarom.",
    ).toEqual([]);
  });

  it("elk gepubliceerd cijfer staat in claims.md", () => {
    if (GEMONTEERD.length === 0) return;
    const ongedekt = CIJFERS.filter((c) => !REGIO.includes(c));
    expect(
      ongedekt,
      `ResultsStrip staat op ${GEMONTEERD.join(", ")} en publiceert ${ongedekt.join(", ")}, ` +
        `maar die staan niet in het juandiazllc.com-deel van docs/claims.md. ` +
        `Zet het cijfer daar neer met opdracht en datum, of haal de kaart weg.`,
    ).toEqual([]);
  });

  it("claims.md houdt niet tegelijk vol dat er geen klantresultaten zijn", () => {
    /* Tweede slot. Het eerste vangt een ontbrekend cijfer; dit vangt de
     * halve reparatie: cijfers toegevoegd, maar de regel die zegt dat ze niet
     * bestaan blijft staan. `results.sub` belooft de lezer in vier talen dat
     * elk cijfer uit een live opdracht komt — dan mag claims.md niet het
     * tegendeel beweren. */
    if (GEMONTEERD.length === 0) return;
    const ontkenning = REGIO.split("\n").find((r) => /Client results/i.test(r) && r.includes("❌"));
    expect(
      ontkenning,
      `ResultsStrip is gemonteerd, maar claims.md zegt nog: "${ontkenning?.trim()}". ` +
        `Werk die regel bij of haal het blok weg — beide kan niet waar zijn.`,
    ).toBeUndefined();
  });
});
