import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  BLOKKEN,
  VOLGORDE,
  VRAGEN,
  alleBeantwoord,
  lekt,
  scoor,
  type Antwoorden,
} from "./lekkage-scan";

const WORTEL = join(__dirname, "..");

/** Het document met één spatie tussen alles — hij breekt regels op 80 tekens. */
const DOC = readFileSync(join(WORTEL, "docs", "lead-magnet.md"), "utf8").replace(/\s+/g, " ");

const alles = (waarde: boolean): Antwoorden =>
  Object.fromEntries(VRAGEN.map((v) => [v.id, waarde]));

describe("de vragenlijst", () => {
  it("telt vijftien vragen met unieke id's", () => {
    expect(VRAGEN).toHaveLength(15);
    expect(new Set(VRAGEN.map((v) => v.id)).size).toBe(15);
  });

  it("verdeelt ze over vier blokken die allemaal gevuld zijn", () => {
    expect(BLOKKEN.map((b) => b.id)).toEqual([...VOLGORDE]);
    for (const b of BLOKKEN) {
      expect(VRAGEN.filter((v) => v.blok === b.id).length, `blok ${b.id} is leeg`).toBeGreaterThan(0);
    }
    // Elke vraag hoort bij een bestaand blok — een typefout in `blok` zou hem
    // anders stilzwijgend uit de uitslag laten vallen.
    const geldig = new Set(BLOKKEN.map((b) => b.id));
    for (const v of VRAGEN) expect(geldig.has(v.blok), `${v.id} wijst naar blok ${v.blok}`).toBe(true);
  });

  /* docs/lead-magnet.md §2 draagt dezelfde vijftien vragen. Twee kopieën van
   * één tekst lopen uit elkaar zonder dat iemand het merkt — dat is precies wat
   * er met public/llms.txt gebeurde (#199), waar het document een bewering bleef
   * dragen die de code al had ingetrokken. */
  it("staat woordelijk in docs/lead-magnet.md", () => {
    for (const v of VRAGEN) {
      expect(DOC.includes(v.vraag), `${v.id} staat niet (zo) in het document: ${v.vraag}`).toBe(true);
    }
  });

  it("controleert dat op een manier die kán falen", () => {
    // Zonder deze controle is een altijd-slagende includes() niet te
    // onderscheiden van een document dat werkelijk alles draagt.
    expect(DOC.includes("Een vraag die nooit in het document heeft gestaan?")).toBe(false);
    expect(DOC.length).toBeGreaterThan(5000);
  });

  /* Geen bedrag in wat de bezoeker leest. docs/claims.md is de enige bron voor
   * een cijfer over resultaten, en een voorspelde besparing in een scan is per
   * definitie verzonnen — hij kent het bedrijf niet. */
  const BEDRAG = /[€$£]|\d+\s*%|\d+[.,]\d+\s*[x×]/;

  it("noemt nergens een bedrag of percentage tegen de bezoeker", () => {
    for (const v of VRAGEN) {
      expect(BEDRAG.test(v.vraag), `${v.id} vraag noemt een cijfer`).toBe(false);
      expect(BEDRAG.test(v.kost), `${v.id} kost noemt een cijfer`).toBe(false);
    }
  });

  it("gebruikt daarvoor een patroon dat wél afgaat", () => {
    for (const proef of ["bespaart €400 per maand", "scheelt 30%", "levert 3,2× op"]) {
      expect(BEDRAG.test(proef), `patroon mist: ${proef}`).toBe(true);
    }
  });

  it("geeft elke vraag een kostenregel", () => {
    for (const v of VRAGEN) expect(v.kost.length, `${v.id} heeft geen kostenregel`).toBeGreaterThan(40);
  });
});

describe("lekt()", () => {
  const gewoon = VRAGEN.find((v) => !v.omgekeerd)!;
  const omgekeerd = VRAGEN.find((v) => v.omgekeerd)!;

  it("telt bij een gewone vraag 'nee' als lek", () => {
    expect(lekt(gewoon, false)).toBe(true);
    expect(lekt(gewoon, true)).toBe(false);
  });

  it("telt bij de omgekeerde vraag juist 'ja' als lek", () => {
    // D2 staat met opzet omgekeerd: vijftien vragen waarbij nee altijd slecht is
    // vult iemand op de automatische piloot in.
    expect(omgekeerd.id).toBe("D2");
    expect(lekt(omgekeerd, true)).toBe(true);
    expect(lekt(omgekeerd, false)).toBe(false);
  });

  it("telt een onbeantwoorde vraag niet als lek", () => {
    expect(lekt(gewoon, undefined)).toBe(false);
    expect(lekt(omgekeerd, undefined)).toBe(false);
  });
});

describe("scoor()", () => {
  it("geeft niets terug bij een lege scan", () => {
    expect(scoor({})).toEqual([]);
    expect(alleBeantwoord({})).toBe(false);
  });

  it("geeft niets terug als er niets lekt", () => {
    // Overal ja, behalve de omgekeerde vraag. Een scan die dan tóch iets meldt
    // is een verkoopinstrument en geen diagnose.
    const perfect = { ...alles(true), D2: false };
    expect(alleBeantwoord(perfect)).toBe(true);
    expect(scoor(perfect)).toEqual([]);
  });

  it("vindt bij overal-ja alleen het omgekeerde lek", () => {
    const uit = scoor(alles(true));
    expect(uit).toHaveLength(1);
    expect(uit[0].blok).toBe("D");
    expect(uit[0].vragen.map((v) => v.id)).toEqual(["D2"]);
  });

  it("toont er hooguit drie, ook als alle vier lekken", () => {
    const alleVier = { ...alles(false), D2: true };
    expect(scoor(alleVier)).toHaveLength(3);
    expect(scoor(alleVier, 4)).toHaveLength(4);
  });

  it("zet het grootste lek bovenaan", () => {
    // B lekt drie keer, A één keer.
    const uit = scoor({ A1: false, B1: false, B2: false, B3: false });
    expect(uit.map((l) => l.blok)).toEqual(["B", "A"]);
    expect(uit[0].aantal).toBe(3);
  });

  it("breekt gelijkspel op de vaste volgorde A→B→C→D", () => {
    // Eén lek per blok. De uitslag moet reproduceerbaar zijn, niet afhankelijk
    // van de stabiliteit van Array#sort — de comparator doet het expliciet.
    const uit = scoor({ D1: false, C1: false, B1: false, A1: false });
    expect(uit.map((l) => l.blok)).toEqual(["A", "B", "C"]);
  });

  it("noemt per lek de vragen die lekten", () => {
    const uit = scoor({ C2: false, C4: false });
    expect(uit).toHaveLength(1);
    expect(uit[0].vragen.map((v) => v.id)).toEqual(["C2", "C4"]);
    expect(uit[0].lek).toBe("Hetzelfde feit wordt meermaals getypt");
  });
});

/* De scan mag geen wees worden.
 *
 * scripts/seo-audit.ts meldde precies dat toen de pagina gebouwd was en er
 * nog niets naartoe linkte: “staat in de sitemap maar wordt nergens vandaan
 * gelinkt”. Dat is daar een waarschuwing en geen fout, dus het zou een
 * volgende keer stilletjes terug kunnen komen. Hier is het een fout. */
describe("de scan hangt ergens aan", () => {
  /* Een telling boven nul is niet genoeg: dan mag een montage stilletjes
   * verdwijnen zolang er nog een overblijft. Dezelfde vorm als HOORT_TE_STAAN
   * in components/ResultsStrip.test.ts — elke plek met de reden waarom hij
   * daar hoort, zodat verdwijnen en er-ongemotiveerd-bijkomen allebei rood zijn. */
  const HOORT_TE_STAAN: Record<string, string> = {
    "app/[locale]/services/page.tsx":
      "onder de slot-CTA — lagere drempel voor wie nog niet wil boeken",
    "app/[locale]/tools/energy-roi/page.tsx":
      "de hoogste-intentiepagina van de site, en hij ving zelf niets",
    "app/[locale]/insights/[slug]/page.tsx":
      "onder de energie-artikelen (post.tag === Energy) — daar zit het ICP",
  };

  const paginas = (() => {
    const uit: string[] = [];
    const loop = (map: string) => {
      for (const naam of readdirSync(map)) {
        const pad = join(map, naam);
        if (statSync(pad).isDirectory()) {
          if (naam === "node_modules") continue;
          loop(pad);
        } else if (naam.endsWith(".tsx")) uit.push(pad);
      }
    };
    loop(join(WORTEL, "app"));
    return uit;
  })();

  it("vindt pagina's om te doorzoeken", () => {
    expect(paginas.length).toBeGreaterThan(10);
  });

  it("staat op precies de plekken waar hij hoort", () => {
    const gevonden = paginas
      .filter((p) => readFileSync(p, "utf8").includes("<ScanCallout"))
      .map((p) => relative(WORTEL, p).split(sep).join("/"))
      .sort();
    expect(gevonden).toEqual(Object.keys(HOORT_TE_STAAN).sort());
  });

  it("hangt op de artikelpagina achter de Energy-tag", () => {
    // Zonder die voorwaarde staat hij onder elk artikel, ook onder de
    // real-estate- en hospitality-stukken die een ander publiek hebben.
    const bron = readFileSync(
      join(WORTEL, "app", "[locale]", "insights", "[slug]", "page.tsx"),
      "utf8",
    );
    expect(bron).toMatch(/post\.tag === "Energy" && <ScanCallout/);
  });
});
