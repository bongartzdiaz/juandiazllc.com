import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { zonderCommentaar } from "@/lib/bronscan";

// De klasse achter #329, gegeneraliseerd.
//
// Dat defect was: een effect in de ROOT-layout dat DOM-nodes onthoudt, met
// een lege afhankelijkheidslijst. De App Router remount de root-layout nooit
// bij client-side navigatie, dus die nodes zijn na een <Link> vervangen door
// andere -- en het effect wijst naar wat er niet meer staat. Stond de
// standaardtoestand van die nodes op opacity 0, dan bleef de inhoud
// permanent onzichtbaar terwijl hij wel geserveerd werd. Vijf pagina's, vier
// talen, en geen enkel bestaand instrument kon het zien.
//
// DE REGEL IS SCHERPER DAN "LEGE DEPS IS FOUT".
//
// BackToTop en Chapters hebben allebei }, [] en zijn allebei immuun: hun
// listener hangt op window en de zichtbaarheid gaat via React-state naar hun
// eigen render. Ze onthouden geen node. Wat #329 brak was de combinatie
// querySelectorAll/getElementById + per-pagina-elementen + een CSS-regel die
// die elementen verbergt tot JavaScript ze onthult.
//
// Deze poort bewaakt precies die combinatie. Gemeten op 2026-09-03: nul
// gevallen buiten de twee vrijstellingen hieronder, en [data-reveal] is in
// #329 uit deze klasse gehaald.
//
// TEKSTSCAN, GEEN MODULE-IMPORT -- zelfde afweging als components/reveal.test.ts:
// het defect zit in de bedrading (welke deps, welke selector, welke layout),
// en een import ziet een correct geschreven effect zonder te kunnen zien dat
// het een keer draait.
//
// WAT DEZE POORT NIET ZIET: of een selector in de praktijk per pagina
// verschilt. Hij neemt aan dat elke querySelectorAll/getElementById in een
// mount-once effect dat kan doen, en dat is de veilige kant om op te falen.
//
// EN: hij legt geen id naast een klasse. JavaScript vist #preload op, CSS
// verbergt .preload -- twee namen voor hetzelfde element, en deze poort
// verbindt ze niet. Dat overbruggen vergt een aanname over de markup, en een
// onterechte treffer met een stellige melding is duurder dan een blinde vlek
// die opgeschreven staat. Vandaar de tweede naam per vrijstelling hieronder.

const WORTEL = join(__dirname, "..");
const EFFECTS_PAD = join(WORTEL, "components", "GlobalEffects.tsx");
const CSS_PAD = join(WORTEL, "app", "globals.css");

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

const BRON = zonderCommentaar(lees(EFFECTS_PAD));
const CSS = lees(CSS_PAD);

// Elk effect met [pathname] is gerepareerd en heeft zijn eigen poort. Alles NA
// de LAATSTE afsluiter is het mount-once deel, en daar gaat dit bestand over.
//
// lastIndexOf, niet indexOf. Bij het eerste voorkomen zou elk NA de eerste
// reparatie toegevoegd pathname-effect binnen het zogenaamde mount-once blok
// vallen, en dan beoordeelt deze poort een correct bedraad effect onder de
// verkeerde regels -- stil, want zo een blok leest verder normaal. Gemeten op
// 2026-09-03: twee pathname-effecten, reveal en de zwevende knop.
const SPLITS = "}, [pathname]);";

function eenmaligBlok(): string {
  const i = BRON.lastIndexOf(SPLITS);
  if (i === -1) {
    throw new Error(
      `Kon "${SPLITS}" niet vinden in GlobalEffects.tsx. Is het pathname-effect ` +
        `hernoemd of verplaatst? Zonder die scheiding weet deze poort niet welk ` +
        `deel mount-once is, en dan meet hij het verkeerde blok.`
    );
  }
  return BRON.slice(i + SPLITS.length);
}

/** Selectors die het mount-once effect uit de DOM opvist. */
function selectorsUit(blok: string): string[] {
  const uit = new Set<string>();
  for (const m of blok.matchAll(/querySelectorAll(?:<[^>]*>)?\(\s*"([^"]+)"/g)) {
    for (const deel of m[1].split(",")) {
      const s = deel.trim();
      if (s) uit.add(s);
    }
  }
  for (const m of blok.matchAll(/getElementById\(\s*"([^"]+)"/g)) {
    uit.add("#" + m[1]);
  }
  return [...uit];
}

/** Koppen van CSS-regels die hun doel onzichtbaar maken. */
function verbergendeKoppen(css: string): string[] {
  const uit: string[] = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/opacity:\s*0\s*[;}]|visibility:\s*hidden/.test(m[2])) {
      uit.push(m[1].trim().replace(/\s+/g, " "));
    }
  }
  return uit;
}

// Een ::before of ::after draagt geen inhoud -- het is een decoratieve laag
// (glow, streep, overlay) die per definitie onzichtbaar begint. Zou die op de
// lijst staan, dan meldt de poort elke hover-glow in deze codebase en wordt
// hij binnen een week uitgezet.
function draagtInhoud(kop: string): boolean {
  return !/::(before|after)\b/.test(kop);
}

// Vrijstellingen dragen elk hun reden EN hun voorwaarde: valt de voorwaarde
// weg, dan valt de vrijstelling om in plaats van stil te blijven staan.
//
// TWEE NAMEN, met opzet. `selector` is wat de uitlezer uit de JavaScript
// haalt (#preload, uit getElementById); `verbergtAls` is de naam waaronder
// de CSS hem verbergt (.preload). Een vrijstelling die maar een van beide
// droeg, kon de helft van haar eigen voorwaarde niet controleren -- en dat
// bleef staan zolang een andere vrijstelling ervoor omviel.
const VRIJGESTELD: { selector: string; verbergtAls: string; reden: string }[] = [
  {
    selector: "#preload",
    verbergtAls: ".preload",
    reden:
      "de enige verbergende regel is .preload.done -- de EINDtoestand nadat de " +
      "preloader klaar is, niet de begintoestand. De basisregel verbergt niets.",
  },
];

describe("verborgen inhoud achter een mount-once effect", () => {
  it("het pathname-effect en het mount-once effect zijn te scheiden", () => {
    const blok = eenmaligBlok();
    expect(blok.length).toBeGreaterThan(200);
    expect(blok).toContain("}, []);");
    // en het gerepareerde effect zit er NIET in
    expect(blok).not.toContain('querySelectorAll("[data-reveal]")');
  });

  it("de selector-uitlezer vindt werkelijk selectors", () => {
    const sel = selectorsUit(eenmaligBlok());
    expect(sel.length).toBeGreaterThan(5);
    expect(sel).toContain(".btn-mag");
    // komma-lijsten worden gesplitst, anders telt ".v-card, .sec-card" als een
    expect(sel).toContain(".v-card");
    expect(sel).toContain(".sec-card");
  });

  it("de verberg-uitlezer vindt werkelijk verbergende regels", () => {
    const koppen = verbergendeKoppen(CSS);
    expect(koppen.length).toBeGreaterThan(10);
    expect(koppen.some((k) => k.includes("[data-reveal]"))).toBe(true);
    expect(koppen.some((k) => k.includes(".hp-field"))).toBe(true);
    expect(koppen.some((k) => k.includes(".zzz-bestaat-niet"))).toBe(false);
  });

  it("de pseudo-element-uitzondering is niet vacuum", () => {
    const koppen = verbergendeKoppen(CSS);
    const pseudo = koppen.filter((k) => !draagtInhoud(k));
    // hij MOET iets uitsluiten, anders sluit hij niets uit en is hij dood hout
    expect(pseudo.length).toBeGreaterThan(0);
    expect(pseudo.some((k) => k.includes("::before"))).toBe(true);
    // en hij mag een gewone selector niet wegfilteren
    expect(draagtInhoud(".float-cta")).toBe(true);
    expect(draagtInhoud("[data-reveal]")).toBe(true);
  });

  it("geen enkele selector uit het mount-once effect verbergt inhoud", () => {
    const sel = selectorsUit(eenmaligBlok());
    const koppen = verbergendeKoppen(CSS).filter(draagtInhoud);
    const vrij = new Set(VRIJGESTELD.map((v) => v.selector));

    const overtreders: string[] = [];
    for (const s of sel) {
      if (vrij.has(s)) continue;
      const treffers = koppen.filter((k) => k.includes(s));
      if (treffers.length > 0) {
        overtreders.push(`${s} <- ${treffers.join(" | ")}`);
      }
    }

    expect(
      overtreders,
      `Deze selectors worden door het mount-once effect in GlobalEffects uit de DOM ` +
        `gevist EN staan in CSS op onzichtbaar. Na een client-side navigatie wijst ` +
        `dat effect naar nodes die er niet meer zijn, dus blijven ze onzichtbaar -- ` +
        `precies het defect van #329. Twee geldige oplossingen: koppel het effect ` +
        `aan [pathname] zoals het reveal-effect, of geef de selector een ` +
        `CSS-ontsnapping die geen JavaScript nodig heeft. Is de faalvorm werkelijk ` +
        `onschadelijk, zet hem dan met reden in VRIJGESTELD.\n  ` +
        overtreders.join("\n  ")
    ).toEqual([]);
  });

  it("elke vrijstelling is nog waar", () => {
    const sel = new Set(selectorsUit(eenmaligBlok()));
    const koppen = verbergendeKoppen(CSS).filter(draagtInhoud);

    for (const { selector, verbergtAls, reden } of VRIJGESTELD) {
      expect(reden.length).toBeGreaterThan(40);
      expect(
        sel.has(selector),
        `${selector} staat vrijgesteld maar wordt door het mount-once effect niet ` +
          `meer aangeraakt. Haal de vrijstelling weg -- een vrijstelling die zijn ` +
          `aanleiding overleeft, dekt over een jaar iets anders af dan bedoeld.`
      ).toBe(true);
      expect(
        koppen.some((k) => k.includes(verbergtAls)),
        `${selector} staat vrijgesteld als ${verbergtAls}, maar geen enkele ` +
          `CSS-regel met die naam verbergt nog iets. Haal de vrijstelling weg.`
      ).toBe(true);
    }
  });

  it(".preload verbergt alleen in zijn eindtoestand", () => {
    // De voorwaarde onder de tweede vrijstelling. Krijgt de BASISregel ooit
    // opacity 0, dan is de reden niet meer waar en moet die opnieuw beoordeeld.
    const koppen = verbergendeKoppen(CSS).filter((k) => k.includes(".preload"));
    expect(koppen.length).toBeGreaterThan(0);
    for (const k of koppen) {
      expect(
        k,
        `Een verbergende regel op .preload zonder .done. De vrijstelling in ` +
          `VRIJGESTELD leunt erop dat alleen de eindtoestand verbergt.`
      ).toContain(".done");
    }
  });
});
