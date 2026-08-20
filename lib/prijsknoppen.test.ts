import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DICT, LOCALES, type Locale } from "./i18n/dict";

/* Poort: een knop mag geen stap beloven die achter hem niet gebeurt.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * AANLEIDING. Op 2026-08-20 stond er op /pricing in vier talen drie keer een
 * knop met de tekst "Start free trial" / "Start gratis proefperiode" /
 * "Kostenlos testen" / "Empieza tu prueba gratis". Alle drie gingen naar
 * `/contact`. Er is geen proefperiode om te starten; er is een formulier.
 * Stripe vertrok met #134 en het aanmeldpad is nooit gebouwd — de pagina zelf
 * schrijft dat op, in een comment boven TIERS: "CTAs land on /contact in
 * beta-phase (Juan hand-onboards customers 1-5 via de contactvorm)".
 *
 * Het aanbod was niet het probleem. De proefperiode van veertien dagen staat in
 * `_drafts/pricing/pricing-tiers.csv` en blijft staan. Wat er niet klopte was
 * het werkwoord: "start" belooft dat de klik het ding in gang zet.
 *
 * WAT DEZE POORT DOET. Voor elke tier leest hij de `ctaHref` uit de pagina.
 * Wijst die naar `/contact`, dan mag het bijbehorende knoplabel geen
 * zelfbedieningsbelofte dragen. Wijst hij naar `/signup` — het pad dat volgens
 * datzelfde comment ooit komt — dan vervalt de regel voor die tier vanzelf.
 *
 * De poort schakelt zichzelf dus uit op het moment dat de belofte waar wordt.
 * Dat is opzet: een verbod dat blijft staan nadat de reden verdween, wordt
 * over een jaar weggehaald door iemand die niet weet waarom het er stond. */

const WORTEL = join(__dirname, "..");
const PAGINA = join(WORTEL, "app", "[locale]", "pricing", "page.tsx");
const bron = readFileSync(PAGINA, "utf8");

/** Eén knop op de pagina: welke i18n-sleutel hij toont, waar hij heen gaat. */
type Knop = { sleutel: string; href: string };

/* TIERS staat in een gegenereerd blok (npm run regen:pricing). We lezen het als
 * tekst en niet als module, want de pagina importeert next/*; wat we bewaken is
 * bovendien wat er in het bestand staat, niet wat een module toevallig
 * exporteert. Zelfde reden als in components/sections/ResultsStrip.test.ts. */
function tierKnoppen(): Knop[] {
  const uit: Knop[] = [];
  const re = /\{\s*key:\s*"([a-z]+)"[^}]*ctaHref:\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(bron)) !== null) {
    uit.push({ sleutel: `pricing.cta.${m[1]}`, href: m[2] });
  }
  return uit;
}

/* De slot-CTA staat niet in TIERS maar los in de JSX, met zijn href ernaast. */
function outroKnop(): Knop | null {
  const m = /href="([^"]+)"[^>]*>\s*\{t\("pricing\.outro\.cta"\)\}/.exec(bron);
  return m ? { sleutel: "pricing.outro.cta", href: m[1] } : null;
}

const KNOPPEN: Knop[] = [...tierKnoppen(), ...(outroKnop() ? [outroKnop()!] : [])];

/* Woorden die zeggen "deze klik zet het in gang". Per taal, want dit is de
 * enige plek waar het taalgebonden is. Kleingeschreven vergelijking.
 *
 * Bewust kort: alleen formuleringen die een handeling starten. "Aan de slag" en
 * "Get started" staan er niet in — die beloven een begin, geen mechaniek, en
 * een formulier ís een begin. */
const ZELFBEDIENING: Record<Locale, readonly string[]> = {
  en: ["start free trial", "start your trial", "sign up now", "start now"],
  nl: ["start gratis", "start je proefperiode", "meld je nu aan", "begin nu"],
  de: ["kostenlos testen", "jetzt testen", "jetzt registrieren", "test starten"],
  es: ["empieza tu prueba", "prueba gratis ahora", "regístrate ahora"],
};

function overtreding(waarde: string, l: Locale): string | null {
  const laag = waarde.toLowerCase();
  return ZELFBEDIENING[l].find((z) => laag.includes(z)) ?? null;
}

describe("prijsknoppen beloven geen stap die er niet is", () => {
  /* Zonder deze drie zou een hernoemd veld of een verplaatst bestand de poort
   * stilzwijgend op een lege lijst laten slagen — de fout uit
   * feedback_assert_niet_door_het_vangnet. */
  it("leest de knoppen daadwerkelijk uit de pagina", () => {
    expect(KNOPPEN.length, "geen enkele knop gevonden in pricing/page.tsx").toBeGreaterThanOrEqual(5);
    expect(KNOPPEN.map((k) => k.sleutel)).toContain("pricing.cta.starter");
    expect(KNOPPEN.map((k) => k.sleutel)).toContain("pricing.outro.cta");
  });

  it("vindt voor elke knop een bestaand label in alle vier de talen", () => {
    const ontbreekt: string[] = [];
    for (const knop of KNOPPEN) {
      for (const l of LOCALES) {
        if (!DICT[l][knop.sleutel]) ontbreekt.push(`${l}/${knop.sleutel}`);
      }
    }
    expect(ontbreekt).toEqual([]);
  });

  it("herkent een zelfbedieningsbelofte als die er staat", () => {
    /* De verbodslijst moet kunnen matchen. Zonder deze assertie zou een typefout
     * in ZELFBEDIENING de poort permanent groen zetten. */
    expect(overtreding("Start free trial", "en")).toBe("start free trial");
    expect(overtreding("Kostenlos testen", "de")).toBe("kostenlos testen");
    expect(overtreding("Vraag je proefperiode aan", "nl")).toBeNull();
  });

  it("belooft geen zelfbediening zolang de knop naar het formulier gaat", () => {
    const fout: string[] = [];
    for (const knop of KNOPPEN) {
      if (!knop.href.startsWith("/contact")) continue; // /signup: regel vervalt
      for (const l of LOCALES) {
        const waarde = DICT[l][knop.sleutel] ?? "";
        const z = overtreding(waarde, l);
        if (z) fout.push(`${l} · ${knop.sleutel} = "${waarde}" → ${knop.href} (bevat "${z}")`);
      }
    }

    expect(
      fout,
      "Deze knop gaat naar het contactformulier maar zegt dat hij iets start. " +
        "Bouw het pad (dan wijst ctaHref naar /signup en vervalt deze regel " +
        "vanzelf), of noem de stap die de bezoeker werkelijk krijgt.",
    ).toEqual([]);
  });
});
