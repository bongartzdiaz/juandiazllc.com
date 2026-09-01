import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zonderCommentaar } from "./bronscan";
import {
  AANTAL_WOORD,
  BLOKKEN,
  MET_METING,
  VOLGORDE,
  VRAGEN,
  alleBeantwoord,
  duidMetingen,
  lekt,
  scoor,
  telwoordNL,
  type Antwoorden,
} from "./lekkage-scan";

const WORTEL = join(__dirname, "..");

/** Het document met één spatie tussen alles — hij breekt regels op 80 tekens. */
const DOC = readFileSync(join(WORTEL, "docs", "lead-magnet.md"), "utf8").replace(/\s+/g, " ");

/** De bron voor elk cijfer dat de scan uitspreekt. Zie docs/claims.md. */
const CLAIMS = readFileSync(join(WORTEL, "docs", "claims.md"), "utf8").replace(/\s+/g, " ");

/** De partnertekst leest hetzelfde aantal; hij gaat naar buiten. */
const PARTNERS = readFileSync(join(WORTEL, "docs", "partners.md"), "utf8").replace(/\s+/g, " ");

const alles = (waarde: boolean): Antwoorden =>
  Object.fromEntries(VRAGEN.map((v) => [v.id, waarde]));

describe("de vragenlijst", () => {
  it("telt zestien vragen met unieke id's", () => {
    expect(VRAGEN).toHaveLength(16);
    expect(new Set(VRAGEN.map((v) => v.id)).size).toBe(16);
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

  /* docs/lead-magnet.md §2 draagt dezelfde zestien vragen. Twee kopieën van
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
    // D2 staat met opzet omgekeerd: zestien vragen waarbij nee altijd slecht is
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

  /* A en C zijn de enige twee blokken van gelijke grootte, dus alleen daar kan
   * een gelijkspel ontstaan dat noch op aandeel noch op aantal te breken is —
   * precies het geval waarvoor de vaste volgorde in de comparator staat. De
   * uitslag moet reproduceerbaar zijn en niet afhangen van de stabiliteit van
   * Array#sort. */
  it("breekt gelijkspel op de vaste volgorde A→B→C→D", () => {
    const uit = scoor({ C1: false, C2: false, A1: false, A2: false });
    expect(uit.map((l) => l.blok)).toEqual(["A", "C"]);
    expect(uit.map((l) => l.aandeel)).toEqual([0.5, 0.5]);
  });

  /* Rangschikken op AANDEEL, niet op aantal.
   *
   * Zolang elk blok even veel vragen droeg waren die twee hetzelfde. Blok B
   * heeft er vijf en blok D drie, en dan wint tellen automatisch het grootste
   * blok: twee lekken van vijf is minder erg dan twee van drie, maar een teller
   * ziet twee keer twee. Zonder deze assertie zou een vraag toevoegen zijn
   * eigen blok stilzwijgend zwaarder maken — en dat is precies wat B5 deed. */
  it("rangschikt op aandeel en niet op aantal", () => {
    const uit = scoor({ B1: false, B2: false, D1: false, D3: false });
    expect(uit.map((l) => l.aantal)).toEqual([2, 2]);
    expect(uit.map((l) => l.blok)).toEqual(["D", "B"]);
    expect(uit[0].aandeel).toBeGreaterThan(uit[1].aandeel);
  });

  it("noemt per lek de vragen die lekten", () => {
    const uit = scoor({ C2: false, C4: false });
    expect(uit).toHaveLength(1);
    expect(uit[0].vragen.map((v) => v.id)).toEqual(["C2", "C4"]);
    expect(uit[0].lek).toBe("Hetzelfde feit wordt meermaals getypt");
  });
});

/* De twee invulvelden.
 *
 * Dit is het enige deel van de scan dat een getal uitspreekt, en dus het enige
 * deel dat aan docs/claims.md vastzit. De rest is een ja of een nee. */
describe("de metingen", () => {
  it("hangen aan de twee vragen die erom vragen", () => {
    expect(MET_METING.map((v) => v.id)).toEqual(["B1", "B3"]);
  });

  /* Een opdracht of label met een getal erin is een claim die niemand heeft
   * nagetrokken. De bron is de enige uitzondering: die noemt per definitie een
   * jaartal en een steekproef, en dat is juist wat hem controleerbaar maakt. */
  it("spreken zelf geen cijfers uit", () => {
    for (const v of MET_METING) {
      const m = v.meting!;
      for (const [veld, tekst] of Object.entries({
        opdracht: m.opdracht,
        label: m.label,
        eenheid: m.eenheid,
        duiding: m.grens?.duiding ?? "",
      })) {
        expect(/[0-9]/.test(tekst), v.id + "." + veld + " draagt een cijfer: " + tekst).toBe(false);
      }
    }
  });

  it("controleert dat met een patroon dat kán vallen", () => {
    // Zonder deze regel is een lege overtreedslijst niet te onderscheiden van
    // een kapotte regex.
    expect(/[0-9]/.test("binnen 5 minuten")).toBe(true);
  });

  /* Er is precies één grens in dit instrument, en hij draagt een bron.
   * "Langer dan 15 minuten", "meer dan 5 uur per week" en "langer dan 48 uur"
   * zijn alle drie voorgesteld en alle drie afgewezen: geen bron. */
  it("dragen hooguit één grens, en die staat in docs/claims.md", () => {
    const metGrens = MET_METING.filter((v) => v.meting?.grens);
    expect(metGrens.map((v) => v.id)).toEqual(["B3"]);

    const grens = metGrens[0].meting!.grens!;
    expect(grens.waarde).toBe(1);
    expect(metGrens[0].meting!.eenheid).toBe("uur");

    // De bron moet terug te vinden zijn in de claim-tabel. Niet op identieke
    // formulering — op de twee feiten die hem controleerbaar maken.
    expect(CLAIMS).toContain("Reactietijd op leads");
    for (const feit of ["2011", "2.241"]) {
      expect(grens.bron, "de bron noemt " + feit + " niet").toContain(feit);
      expect(CLAIMS, "docs/claims.md noemt " + feit + " niet").toContain(feit);
    }
  });

  /* De 78% is folklore — docs/claims.md zegt met zoveel woorden dat hij niet
   * gepubliceerd mag worden. Deze regel houdt hem uit de scan én uit het
   * document, want daar zou hij als eerste terugkomen. */
  it("dragen de onvindbare 78% nergens", () => {
    const alleTekst = [
      ...VRAGEN.map((v) => v.vraag + " " + v.kost),
      ...MET_METING.map((v) => JSON.stringify(v.meting)),
    ].join(" ");
    expect(alleTekst).not.toContain("78");
    expect(/\b78\s?%/.test(DOC), "docs/lead-magnet.md draagt de 78%").toBe(false);
    // Positieve controle: het patroon valt wel op de echte vorm.
    expect(/\b78\s?%/.test("78% koopt bij wie het eerst reageert")).toBe(true);
  });

  it("geven niets terug voor een veld dat leeg bleef", () => {
    // Leeg is niet nul. Een uitslag die die twee door elkaar haalt vertelt
    // iemand dat hij binnen nul uur reageert.
    expect(duidMetingen({})).toEqual([]);
    expect(duidMetingen({ B3: undefined })).toEqual([]);
    expect(duidMetingen({ B3: Number.NaN })).toEqual([]);
    expect(duidMetingen({ B3: -3 })).toEqual([]);
  });

  it("geven het getal terug zoals het is ingevuld, met de grens erbij", () => {
    const boven = duidMetingen({ B3: 6 });
    expect(boven).toHaveLength(1);
    expect(boven[0].waarde).toBe(6);
    expect(boven[0].bovenGrens).toBe(true);

    expect(duidMetingen({ B3: 1 })[0].bovenGrens).toBe(false);
    expect(duidMetingen({ B3: 0 })[0].waarde).toBe(0);
  });

  it("laten een meting zonder grens ongeduid", () => {
    // B1 heeft er bewust geen: er bestaat geen bron voor een doorlooptijd die
    // "goed" is, en een verzonnen drempel is erger dan geen drempel.
    const uit = duidMetingen({ B1: 12 });
    expect(uit).toHaveLength(1);
    expect(uit[0].meting.grens).toBeUndefined();
    expect(uit[0].bovenGrens).toBeUndefined();
  });
});

/* Het aantal vragen staat op een plek, en alles leest het daar.
 *
 * WAAROM DEZE POORT IS VERBREED. Tot 2026-09-01 las hij alleen
 * docs/lead-magnet.md. Dat document klopte -- het zei "De zestien vragen" --
 * terwijl zes plekken in de geleverde kopij het woord "Vijftien" hardcodeerden,
 * plus docs/partners.md, dat naar partners gaat. De telling dreef weg toen B5
 * erbij kwam, en deze poort bleef groen omdat hij de andere kant op keek.
 *
 * De reparatie is niet het getal bijwerken maar een bron: de kopij leidt het
 * telwoord af uit VRAGEN.length via AANTAL_WOORD. Deze poort bewaakt dat die
 * afleiding blijft staan -- een teruggezet hardgecodeerd telwoord in een
 * scan-oppervlak is rood, ook als het toevallig het juiste getal draagt.
 *
 * Hij leest de bestandstekst en niet de gerenderde uitvoer, want daar zat het
 * defect. Een toelichting die zelf een telwoord noemt valt dus ook om. Dat is
 * de prijs en hij is klein: schrijf AANTAL_WOORD in plaats van het woord. */
describe("de telling van de vragen", () => {
  /** De bestanden die de bezoeker leest. Niet de tests, niet de docs. */
  const SCAN_KOPIJ = [
    "app/[locale]/tools/lekkage-scan/page.tsx",
    "components/LekkageScan.tsx",
    "components/ScanCallout.tsx",
  ];

  /* Elk telwoord dat TELWOORD_NL kent. telwoordNL() gooit buiten die tabel,
   * dus een ingekorte tabel valt hier luid om in plaats van stil minder te
   * bewaken. */
  const TELWOORDEN = Array.from({ length: 9 }, (_, i) => telwoordNL(12 + i));

  /** Woorden, niet substrings: "veertienhonderd" is geen telwoord. */
  const woorden = (bron: string) => new Set(bron.toLowerCase().split(/[^a-z]+/));

  it("noemt in docs/lead-magnet.md hetzelfde aantal als de code draagt", () => {
    expect(DOC).toContain("De " + AANTAL_WOORD + " vragen");

    for (const w of TELWOORDEN) {
      if (w === AANTAL_WOORD) continue;
      expect(DOC.includes("De " + w + " vragen"), "het document noemt ook " + w).toBe(false);
    }
  });

  it("noemt in docs/partners.md hetzelfde aantal", () => {
    // Die tekst gaat naar een partner, die hem doorstuurt. Een verkeerd getal
    // daarin is een belofte die de pagina zelf weerspreekt.
    expect(PARTNERS).toContain(AANTAL_WOORD + " ja/nee-vragen");

    for (const w of TELWOORDEN) {
      if (w === AANTAL_WOORD) continue;
      expect(PARTNERS.includes(w + " ja/nee-vragen"), "partners.md noemt ook " + w).toBe(false);
    }
  });

  it("draagt in de scan-kopij geen hardgecodeerd telwoord", () => {
    const fout: string[] = [];
    for (const pad of SCAN_KOPIJ) {
      const bron = readFileSync(join(WORTEL, pad), "utf8");
      const gevonden = woorden(bron);
      for (const w of TELWOORDEN) {
        if (gevonden.has(w)) fout.push(pad + ": " + w);
      }
    }
    expect(fout).toEqual([]);
  });

  it("leest het telwoord werkelijk uit de bron", () => {
    // Zonder deze assertie slaagt de vorige ook op kopij die het aantal
    // helemaal niet meer noemt -- dan is de telling stilletjes verdwenen.
    for (const pad of SCAN_KOPIJ) {
      const bron = readFileSync(join(WORTEL, pad), "utf8");
      expect(bron, pad + " noemt AANTAL_WOORD niet").toContain("AANTAL_WOORD");
    }
  });

  it("herkent een telwoord werkelijk", () => {
    // Positieve controle: een lege overtredingslijst uit een kapotte splitser
    // leest hetzelfde als schone kopij.
    expect(woorden("Vijftien vragen").has("vijftien")).toBe(true);
    expect(woorden("veertienhonderd euro").has("veertien")).toBe(false);
    expect(TELWOORDEN).toContain(AANTAL_WOORD);
  });
});

/* De scan mag geen wees worden.
 *
 * scripts/seo-audit.ts meldde precies dat toen de pagina gebouwd was en er
 * nog niets naartoe linkte: "staat in de sitemap maar wordt nergens vandaan
 * gelinkt". Dat is daar een waarschuwing en geen fout, dus het zou een
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

/* Het zesde Plausible-doel. De vijf andere meten een klik; dit meet een
   AFRONDING, en dat is het cijfer waar de vraag "wat gebeurt er na de
   klik" op wacht.

   Waarom een poort: op 2026-09-01 vuurde dit doel TWEE keer. `getoond`
   gaat alleen naar true en de vragen blijven onder de uitslag staan, dus
   een bezoeker die zijn antwoord bijstelt verandert `lekken.length` -- een
   dependency van het effect. Gemeten op een productiebuild: lekken=2
   gevolgd door lekken=3, uit een bezoek. Een doel dat dubbel telt meet
   bezoekers noch afrondingen.

   De reparatie is een ref, en die weghalen faalt STIL: geen typefout,
   geen rood, alleen een teller die te hoog staat. Vandaar deze poort.

   Hij leest de bron ZONDER commentaar. Zonder die strip houdt de
   toelichting in het component -- die `gemeld.current` woordelijk
   uitlegt -- de poort vacuum groen. Dat is hier vijf keer misgegaan. */
describe("het doel Scan Voltooid", () => {
  const RUW = readFileSync(join(WORTEL, "components", "LekkageScan.tsx"), "utf8");
  const CODE = zonderCommentaar(RUW);

  it("vuurt het doel af, met het aantal lekken erbij", () => {
    expect(CODE).toContain('plausible?.("Scan Voltooid"');
    expect(CODE).toContain("lekken: String(lekken.length)");
  });

  it("meldt hooguit eenmaal per bezoek", () => {
    const bewaking = CODE.indexOf("if (gemeld.current) return;");
    const melding = CODE.indexOf('plausible?.("Scan Voltooid"');
    expect(bewaking, "de ref-bewaking ontbreekt -- het doel telt dan dubbel").toBeGreaterThan(-1);
    expect(CODE, "de ref moet op false terug als de uitslag niet meer staat").toContain(
      "gemeld.current = false;",
    );
    expect(bewaking, "de bewaking staat NA de melding en houdt dus niets tegen").toBeLessThan(
      melding,
    );
  });

  it("houdt lekken.length in de dependency-array", () => {
    /* De andere helft van de val. Haal je de dependency weg om het dubbel
       tellen te stoppen, dan meldt het doel een VEROUDERD aantal -- stiller
       en erger dan dubbel tellen. De ref lost het op, de dependency blijft. */
    expect(CODE).toContain("[getoond, compleet, lekken.length]");
  });

  it("leest werkelijk code en niet alleen commentaar", () => {
    /* Zonder deze twee is groen ook te verklaren door een strip die alles
       weggooit, of door een bestand dat niet gevonden werd. */
    expect(CODE).toContain("useEffect(");
    expect(RUW.length).toBeGreaterThan(CODE.length);
  });
});
