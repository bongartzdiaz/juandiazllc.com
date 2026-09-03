import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { zonderCommentaar } from "@/lib/bronscan";

// Vijf pagina's serveerden hun inhoud en toonden hem niet: /nl/work,
// /nl/services, /nl/sectors, /nl/insights en /nl/signals, in alle vier de
// talen. De hero stond er, alles eronder was een zwart vlak. In de
// geserveerde HTML stond de tekst gewoon, dus curl en grep meldden die
// pagina's gezond -- het defect zat in de zichtbaarheid, niet in de inhoud.
//
// TWEE OORZAKEN, ALLEBEI STRUCTUREEL.
//
// 1. De observer draaide precies een keer. <GlobalEffects /> hangt in de
//    root-layout, en de App Router remount die nooit bij client-side
//    navigatie. Met een lege afhankelijkheidslijst observeerde
//    querySelectorAll dus alleen de DOM van de eerste pagina; wie daarna
//    doorklikte kreeg elementen die nooit .in kregen, en app/globals.css
//    houdt die permanent op opacity 0. De hero overleefde omdat
//    .page-hero geen data-reveal draagt -- precies wat de schermafdruk liet
//    zien.
//
// 2. Er was geen enkel vangnet. Twee CSS-regels voor [data-reveal] en verder
//    niets: geen prefers-reduced-motion, geen noscript, geen tijdslimiet. Een
//    regel JavaScript was het enige in deze codebase dat .in toevoegde.
//
// Deze poort is een TEKSTSCAN en geen module-import, want het defect zat in
// de BEDRADING: de afhankelijkheidslijst, de plek van het effect, de
// montage in de root-layout. Een import ziet een correct geschreven
// observer en kan niet zien dat hij een keer draait. Zelfde afweging als
// components/sections/Ventures.test.ts en de poort op lead-acknowledge.
//
// Wat deze poort NIET ziet: of de browser werkelijk intersectie berekent.
// Dat is met een DOM-loze runner niet te meten, en het is precies waarom de
// noodrem hieronder op "heeft de callback ooit gevuurd" meet in plaats van
// op een tijdslimiet alleen.

const WORTEL = join(__dirname, "..");
const EFFECTS_PAD = join(WORTEL, "components", "GlobalEffects.tsx");
const CSS_PAD = join(WORTEL, "app", "globals.css");
const LAYOUT_PAD = join(WORTEL, "app", "layout.tsx");

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

const RUW = lees(EFFECTS_PAD);
const BRON = zonderCommentaar(RUW);
const CSS = lees(CSS_PAD);

const ANKER = 'querySelectorAll("[data-reveal]")';
const DEP = /\n\s*\}, \[([^\]]*)\]\);/;

/** Het effect dat [data-reveal] observeert: van useEffect tot dep-array. */
function revealEffect(bron: string): string {
  const i = bron.indexOf(ANKER);
  if (i < 0) throw new Error(`reveal-anker niet gevonden: ${ANKER}`);
  const start = bron.lastIndexOf("useEffect(", i);
  if (start < 0) throw new Error("geen useEffect voor het reveal-anker");
  const m = DEP.exec(bron.slice(i));
  if (!m) throw new Error("geen afhankelijkheidslijst na het reveal-anker");
  return bron.slice(start, i + m.index + m[0].length);
}

/** Wat er tussen de blokhaken van die lijst staat. */
function afhankelijkheden(bron: string): string {
  const i = bron.indexOf(ANKER);
  if (i < 0) throw new Error(`reveal-anker niet gevonden: ${ANKER}`);
  const m = DEP.exec(bron.slice(i));
  if (!m) throw new Error("geen afhankelijkheidslijst na het reveal-anker");
  return m[1].trim();
}

/** Geleverde broncode onder app/, components/ en lib/. Testbestanden tellen
    niet mee: die dragen het patroon als zoekterm en renderen niets. */
function bronBestanden(): string[] {
  const uit: string[] = [];
  const loop = (map: string) => {
    for (const item of readdirSync(map, { withFileTypes: true })) {
      if (item.name === "node_modules" || item.name.startsWith(".")) continue;
      const pad = join(map, item.name);
      if (item.isDirectory()) loop(pad);
      else if (/\.tsx?$/.test(item.name) && !item.name.includes(".test."))
        uit.push(pad);
    }
  };
  for (const map of ["app", "components", "lib"]) loop(join(WORTEL, map));
  return uit;
}

describe("de reveal-observer draait op elke pagina", () => {
  it("leest de bron en niet zijn eigen toelichting", () => {
    // De toelichting in GlobalEffects.tsx MOET het patroon dragen -- ze legt
    // uit waarom het er staat. Zonder strip telt deze poort die mee en meet
    // ze prose in plaats van code. Dat is hier geen aanname maar een
    // meting: ruw staat data-reveal er vaker dan gestript.
    expect(RUW.split("data-reveal").length - 1).toBeGreaterThan(
      BRON.split("data-reveal").length - 1
    );
    expect(BRON.split(ANKER).length - 1).toBe(1);
  });

  it("koppelt het effect aan de pathname", () => {
    expect(afhankelijkheden(BRON)).toBe("pathname");
  });

  it("leest die pathname uit next/navigation", () => {
    expect(BRON).toMatch(/import \{[^}]*usePathname[^}]*\} from "next\/navigation"/);
    expect(BRON).toMatch(/const pathname = usePathname\(\)/);
  });

  it("onderscheidt een gekoppeld effect van een mount-once-effect", () => {
    // Positieve controle. Zonder een tweede effect met een lege lijst zou de
    // assertie hierboven ook slagen op een bestand waarin geen enkel effect
    // een afhankelijkheidslijst draagt -- dan meet ze niets.
    expect(BRON).toMatch(/\n\s*\}, \[\]\);/);
  });
});

describe("de noodrem meet of de observer rekent", () => {
  const effect = revealEffect(BRON);

  it("markeert in de callback dat er gerekend is", () => {
    expect(effect).toMatch(/let heeftGerekend = false/);
    expect(effect).toMatch(/heeftGerekend = true/);
  });

  it("maakt alles zichtbaar als de callback nooit vuurde", () => {
    // De volgorde is dragend: eerst de vlag lezen en terugkeren, pas daarna
    // alles zichtbaar maken. Andersom onthult een tijdslimiet ook inhoud die
    // gewoon nog onder de vouw staat.
    const rem = /setTimeout\(\(\) => \{\s*if \(heeftGerekend\) return;[\s\S]*?classList\.add\("in"\)/;
    expect(effect).toMatch(rem);
  });

  it("ruimt zowel de timer als de observer op", () => {
    // Zonder dit stapelt elke navigatie een observer en een timer op.
    const opruimen = effect.slice(effect.lastIndexOf("return () =>"));
    expect(opruimen).toMatch(/clearTimeout\(noodrem\)/);
    expect(opruimen).toMatch(/io\.disconnect\(\)/);
  });
});

describe("de CSS is het tweede vangnet", () => {
  it("zet [data-reveal] standaard onzichtbaar", () => {
    // Positieve controle, en tegelijk de reden dat dit hele mechanisme
    // bestaat. Vervalt deze regel, dan is de rest van deze poort zinloos.
    expect(CSS).toMatch(/\[data-reveal\] \{ opacity: 0;/);
  });

  it("toont [data-reveal] onvoorwaardelijk bij beperkte beweging", () => {
    const blok = /@media \(prefers-reduced-motion: reduce\) \{\s*\[data-reveal\] \{ opacity: 1;/;
    expect(CSS).toMatch(blok);
  });
});

describe("er is precies een mechanisme dat .in toevoegt", () => {
  const bestanden = bronBestanden();

  it("vindt geleverde broncode om te doorzoeken", () => {
    // Zonder deze ondergrens slaagt de assertie hieronder ook op een lege
    // wandeling, en dan meet ze niets.
    expect(bestanden.length).toBeGreaterThan(50);
  });

  it("voegt .in nergens anders toe dan in het reveal-effect", () => {
    const elders = bestanden.filter(
      (pad) => pad !== EFFECTS_PAD && zonderCommentaar(lees(pad)).includes('classList.add("in")')
    );
    expect(elders).toEqual([]);

    const effect = revealEffect(BRON);
    expect(BRON.split('classList.add("in")').length - 1).toBe(
      effect.split('classList.add("in")').length - 1
    );
  });
});

describe("de montage verklaart waarom de koppeling nodig is", () => {
  it("hangt in de root-layout, en die remount niet bij navigatie", () => {
    expect(zonderCommentaar(lees(LAYOUT_PAD))).toContain("<GlobalEffects />");
  });
});
