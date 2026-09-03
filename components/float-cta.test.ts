import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { zonderCommentaar } from "@/lib/bronscan";

// De zwevende boekknop, gerepareerd op 2026-09-03. Zusterpoort van
// components/reveal.test.ts: zelfde klasse, een laag dieper.
//
// HET DEFECT. getElementById("floatCta") stond in het mount-once effect van
// GlobalEffects. Dat component hangt in de root-layout, en de App Router
// remount die nooit bij client-side navigatie -- dus die opzoeking draaide
// precies een keer per browsersessie. FloatCta rendert null op /contact, dus
// dat ene DOM-knooppunt wordt daar vernietigd en bij het weggaan opnieuw
// aangemaakt. De scroll-handler bleef naar het losgekoppelde knooppunt
// wijzen, en het nieuwe kreeg zijn klasse "show" nooit. De knop stond in CSS
// standaard op opacity 0 en pointer-events none, dus hij was daarna
// permanent onzichtbaar EN onklikbaar -- op elke pagina behalve /contact,
// waar hij juist hoort te ontbreken.
//
// Dat is niet cosmetisch. Het is de hoofd-CTA van de site, en de faalvorm is
// stil: de pagina wordt volledig geserveerd, de knop staat in de DOM, en
// alleen zijn klasse ontbreekt.
//
// WAAROM EEN TEKSTSCAN EN GEEN MODULE-IMPORT. Het defect zat in de bedrading
// -- welke afhankelijkheden, welk effect, welke montage -- en een import ziet
// een correct geschreven scroll-handler zonder te kunnen zien dat hij een
// keer wordt opgehangen. Zelfde afweging als components/reveal.test.ts.
//
// WAT DEZE POORT NIET ZIET: of de browser werkelijk scrollt. Wat hij wel
// vastlegt is dat het knooppunt per navigatie opnieuw wordt opgezocht, dat de
// handler in hetzelfde effect wordt opgeruimd, en dat de zichtbaarheid meteen
// wordt bepaald in plaats van pas bij de eerste scroll.

const WORTEL = join(__dirname, "..");
const EFFECTS_PAD = join(WORTEL, "components", "GlobalEffects.tsx");
const KNOP_PAD = join(WORTEL, "components", "FloatCta.tsx");
const CSS_PAD = join(WORTEL, "app", "globals.css");
const LAYOUT_PAD = join(WORTEL, "app", "[locale]", "layout.tsx");

function lees(pad: string): string {
  return readFileSync(pad, "utf8").replace(/\r\n/g, "\n");
}

const RUW = lees(EFFECTS_PAD);
const BRON = zonderCommentaar(RUW);
const KNOP = zonderCommentaar(lees(KNOP_PAD));
const CSS = lees(CSS_PAD);
const LAYOUT = zonderCommentaar(lees(LAYOUT_PAD));

const ANKER = 'getElementById("floatCta")';
const DEP = /\n\s*\}, \[([^\]]*)\]\);/;

/** Het effect dat de zwevende knop opzoekt: van useEffect tot dep-array. */
function knopEffect(bron: string): string {
  const i = bron.indexOf(ANKER);
  if (i < 0) throw new Error(`anker niet gevonden: ${ANKER}`);
  const start = bron.lastIndexOf("useEffect(", i);
  if (start < 0) throw new Error("geen useEffect voor het anker");
  const m = DEP.exec(bron.slice(i));
  if (!m) throw new Error("geen afhankelijkheidslijst na het anker");
  return bron.slice(start, i + m.index + m[0].length);
}

/** Wat er tussen de blokhaken van die lijst staat. */
function afhankelijkheden(bron: string): string {
  const i = bron.indexOf(ANKER);
  if (i < 0) throw new Error(`anker niet gevonden: ${ANKER}`);
  const m = DEP.exec(bron.slice(i));
  if (!m) throw new Error("geen afhankelijkheidslijst na het anker");
  return m[1].trim();
}

describe("de zwevende boekknop overleeft een navigatie", () => {
  it("het effect is te isoleren en draagt de opzoeking", () => {
    const effect = knopEffect(BRON);
    expect(effect.startsWith("useEffect(")).toBe(true);
    expect(effect).toContain(ANKER);
    expect(effect.length).toBeGreaterThan(200);
  });

  it("het effect hangt aan pathname, niet aan een lege lijst", () => {
    expect(
      afhankelijkheden(BRON),
      `Het effect dat #floatCta opzoekt draait dan een keer per browsersessie. ` +
        `GlobalEffects hangt in de root-layout en die remount niet bij ` +
        `client-side navigatie, en FloatCta rendert null op /contact -- dus na ` +
        `een bezoek aan die pagina wijst de handler naar een losgekoppeld ` +
        `knooppunt en blijft de hoofd-CTA permanent onzichtbaar en onklikbaar.`
    ).toBe("pathname");
  });

  it("de opzoeking staat IN dat effect, niet erbuiten", () => {
    // Zonder deze assertie mag de const naar moduleniveau of naar een ander
    // effect verhuizen terwijl de dep-array blijft staan: dan is de lijst
    // groen en het knooppunt alsnog van de eerste pagina.
    const effect = knopEffect(BRON);
    expect(effect).toContain(`const floatCta = document.${ANKER}`);
    expect(effect).toContain('document.getElementById("cta")');
  });

  it("de handler wordt in hetzelfde effect opgehangen en opgeruimd", () => {
    const effect = knopEffect(BRON);
    const op = effect.match(/addEventListener\("scroll"/g) ?? [];
    const af = effect.match(/removeEventListener\("scroll"/g) ?? [];
    expect(op).toHaveLength(1);
    expect(
      af,
      `Opruimen hoort in hetzelfde effect als ophangen. Staat het elders, dan ` +
        `stapelt elke navigatie een handler op het oude knooppunt.`
    ).toHaveLength(1);
    expect(effect).toContain("return () => {");
  });

  it("de zichtbaarheid wordt meteen bepaald, niet pas bij de eerste scroll", () => {
    // Wie op een lange pagina binnenkomt en niet scrolt, hoort de knop te
    // zien zodra hij voorbij de vouw staat.
    const effect = knopEffect(BRON);
    const iOp = effect.indexOf('addEventListener("scroll"');
    const iRoep = effect.indexOf("onScrollCta();", iOp);
    expect(iRoep).toBeGreaterThan(iOp);
  });

  it("alleen GlobalEffects zet de klasse show", () => {
    // Een tweede plek die dezelfde klasse zet, is een tweede lijst die
    // uiteenloopt -- en dan bewaakt de zwakste.
    const zetters = ["app", "components", "lib"].flatMap((map) =>
      bestanden(join(WORTEL, map))
    );
    expect(zetters.length, "de bestandswandeling vond niets").toBeGreaterThan(50);

    const treffers = zetters.filter((p) => {
      if (p.includes(".test.")) return false;
      const ruw = lees(p);
      // Voorfilter op de RAUWE tekst. zonderCommentaar verwijdert alleen
      // tekens, dus wat hier niet staat kan er na het strippen ook niet
      // staan -- de poort wordt er niet zwakker van, alleen goedkoper.
      // Gemeten: 211 bestanden, waarvan 2 het woord dragen, dus 209
      // stripbeurten minder. Dat scheelt genoeg om de wandeling niet
      // ten koste te laten gaan van de tijdslimiet van buurpoorten.
      if (!ruw.includes("classList")) return false;
      return /classList\.(toggle|add)\(\s*"show"/.test(zonderCommentaar(ruw));
    });
    expect(treffers.map((p) => p.replace(WORTEL, "").replace(/\\/g, "/"))).toEqual([
      "/components/GlobalEffects.tsx",
    ]);
  });

  it("de knop ontbreekt op /contact, en nergens anders", () => {
    // De premisse onder de hele reparatie: dit component rendert soms null,
    // dus het knooppunt verdwijnt en komt terug. Vervalt die tak, dan mag de
    // dep-array terug naar leeg -- en dan hoort deze poort te wijzigen, niet
    // stilzwijgend groen te blijven.
    expect(KNOP).toContain("return null;");
    expect(KNOP).toMatch(/endsWith\(\s*"\/contact"\s*\)/);
    expect(KNOP).toContain('id="floatCta"');
  });

  it("de knop is werkelijk gemonteerd in de locale-layout", () => {
    expect(LAYOUT).toContain("<FloatCta />");
    expect(LAYOUT).toContain('from "@/components/FloatCta"');
  });

  it("de CSS verbergt standaard en onthult op show", () => {
    // Positieve controle: zonder deze twee regels meet alles hierboven niets,
    // want dan is een ontbrekende klasse zonder gevolg.
    const basis = CSS.match(/\n\.float-cta \{([^}]*)\}/);
    expect(basis, "geen basisregel .float-cta gevonden").not.toBeNull();
    expect(basis![1]).toMatch(/opacity:\s*0\s*;/);
    expect(basis![1]).toMatch(/pointer-events:\s*none\s*;/);

    const show = CSS.match(/\n\.float-cta\.show \{([^}]*)\}/);
    expect(show, "geen regel .float-cta.show gevonden").not.toBeNull();
    expect(show![1]).toMatch(/opacity:\s*1\s*;/);
    expect(show![1]).toMatch(/pointer-events:\s*auto\s*;/);
  });

  it("de commentaarstrip is dragend, geen versiering", () => {
    // De toelichting boven het effect noemt getElementById meermaals. Zonder
    // strip leest die uitleg als code en kan elke assertie hierboven groen
    // staan om de verkeerde reden.
    const inRuw = (RUW.match(/getElementById/g) ?? []).length;
    const inBron = (BRON.match(/getElementById/g) ?? []).length;
    expect(inRuw).toBeGreaterThan(inBron);
  });
});

/** Alle .ts/.tsx onder een map, zonder node_modules en verborgen mappen. */
function bestanden(dir: string): string[] {
  const uit: string[] = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (item.name.startsWith(".") || item.name === "node_modules") continue;
    const pad = join(dir, item.name);
    if (item.isDirectory()) uit.push(...bestanden(pad));
    else if (/\.(ts|tsx)$/.test(item.name)) uit.push(pad);
  }
  return uit;
}
