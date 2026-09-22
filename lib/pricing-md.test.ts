import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT } from "./i18n/dict";
import { bouwLlmsTxt } from "./seo/llms";

/* Poort: /pricing.md zegt wat de prijspagina zegt, en niets méér.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * `public/pricing.md` is de machine-leesbare prijslijst voor AI-assistenten en
 * inkoop-agents (sinds 2026-09-22). Hij wordt door `scripts/regenerate-pricing.mjs`
 * gegenereerd uit dezelfde CSV als de prijspagina, en `npm run regen:pricing:check`
 * in CI meldt elke afwijking. Wat die check níet ziet, bewaakt deze poort:
 *
 *   1. De tierprijzen in het bestand zijn de tierprijzen die de pagina toont —
 *      gelezen uit het gegenereerde TIERS-blok in page.tsx, niet overgeschreven.
 *   2. De sprintprijs is die uit docs/claims.md (zelfde rij, zelfde regex als
 *      lib/seo/faqs.belofte.test.ts). Het bestand is de eerste plek buiten de
 *      kopij waar dat bedrag staat; loopt claims.md weg, dan valt dit om.
 *   3. De migratieprijs is die uit `pricing.migration.title` (en). Die staat niet
 *      in de CSV en niet in claims.md; de generator draagt hem als constante.
 *   4. Het bestand noemt geen naam die de site niet meer voert (Philly) en geen
 *      resultaatbelofte — dezelfde regels als voor de kopij.
 *   5. Wie het bestand moet vinden, vindt het: llms.txt linkt ernaar, en de
 *      prijspagina draagt `rel="alternate" type="text/markdown"`.
 *
 * Een agent leest dit bestand in plaats van de pagina. Een prijs die hier
 * klopt maar daar niet, of andersom, is precies de fout waar zo'n bestand
 * slechter van wordt dan geen bestand. */

const WORTEL = join(__dirname, "..");
const MD = readFileSync(join(WORTEL, "public", "pricing.md"), "utf8");
const PAGINA = readFileSync(join(WORTEL, "app", "[locale]", "pricing", "page.tsx"), "utf8");
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf8");

function tiersUitPagina(): { key: string; monthly: string | null; annual: string | null; minSeats: number }[] {
  const blok = PAGINA.split("// <BEGIN GENERATED:TIERS>")[1]?.split("// <END GENERATED:TIERS>")[0] ?? "";
  const re = /key:\s*"(\w+)",\s*monthlyPrice:\s*("([^"]*)"|null),\s*annualPrice:\s*("([^"]*)"|null),\s*minSeats:\s*(\d+)/g;
  const out: ReturnType<typeof tiersUitPagina> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(blok)) !== null) {
    out.push({ key: m[1], monthly: m[3] ?? null, annual: m[5] ?? null, minSeats: Number(m[6]) });
  }
  return out;
}

function sprintprijsUitClaims(): number {
  const m = CLAIMS.match(/\|\s*vaste prijs sprint\s*\|\s*\*\*€([\d.]+)\*\*/);
  if (!m) throw new Error("docs/claims.md draagt geen rij `| vaste prijs sprint | **€…** |` meer");
  return Number(m[1].replace(/\./g, ""));
}

describe("public/pricing.md", () => {
  const tiers = tiersUitPagina();

  it("leest vier tiers uit page.tsx (positieve controle op de lezer)", () => {
    expect(tiers.map((t) => t.key)).toEqual(["starter", "pro", "business", "enterprise"]);
  });

  it("draagt per tier de prijs en het minimum aantal seats van de pagina", () => {
    for (const t of tiers) {
      if (t.monthly) {
        expect(MD, `${t.key}: maandprijs ${t.monthly}`).toContain(`${t.monthly} per seat per month (monthly billing)`);
        expect(MD, `${t.key}: jaarprijs ${t.annual}`).toContain(`${t.annual} per seat per month (annual billing`);
      } else {
        expect(MD).toContain("Price: custom, per organisation rather than per seat");
      }
      expect(MD).toContain(`- Minimum seats: ${t.minSeats}`);
    }
  });

  it("noemt geen prijs die de pagina niet kent", () => {
    // Elk €-bedrag in de tier-secties moet een maand- of jaarprijs van de
    // pagina zijn, de sprintprijs of de migratieprijs. Een vijfde getal is een
    // typefout of een oude prijs.
    const toegestaan = new Set<string>([
      ...tiers.flatMap((t) => [t.monthly, t.annual]).filter((p): p is string => !!p),
      `€${sprintprijsUitClaims().toLocaleString("en-US")}`,
      "€1,500",
    ]);
    const bedragen = MD.match(/€\d[\d,.]*\d|€\d/g) ?? [];
    expect(bedragen.length).toBeGreaterThan(0);
    for (const b of bedragen) expect(toegestaan, `onbekend bedrag ${b}`).toContain(b);
  });

  it("de sprintprijs komt uit docs/claims.md", () => {
    const prijs = sprintprijsUitClaims();
    expect(prijs).toBeGreaterThan(0);
    expect(MD).toContain(`- Price: €${prijs.toLocaleString("en-US")} fixed, excl. VAT`);
  });

  it("de migratieprijs is die van pricing.migration.title (en)", () => {
    const titel = DICT.en["pricing.migration.title"];
    const m = titel.match(/€([\d,]+)/);
    expect(m, "pricing.migration.title (en) noemt geen €-bedrag meer").not.toBeNull();
    expect(MD).toContain(`- Price: €${m![1]} one-time`);
  });

  it("voert geen verouderde naam en geen resultaatbelofte", () => {
    expect(MD).not.toMatch(/Philly/);
    expect(MD).not.toMatch(/guarantee|ROI of|x return|payback/i);
  });

  it("wordt gevonden: llms.txt linkt ernaar en /pricing draagt rel=alternate", () => {
    expect(bouwLlmsTxt()).toContain("/pricing.md");
    expect(PAGINA).toContain('types: { "text/markdown": "/pricing.md" }');
  });

  it("draagt geen datum: een datum zou elke regen een diff geven", () => {
    expect(MD).not.toMatch(/\b20\d\d-\d\d-\d\d\b/);
  });
});
