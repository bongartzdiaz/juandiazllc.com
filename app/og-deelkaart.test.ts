import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zonderCommentaar } from "../lib/bronscan";
import { LOCALES } from "../lib/i18n/dict";
import { AUTHOR_IMAGE_URL, ogImages, twitterImages } from "../lib/seo/branding";

/* Gate: elke deelkaart-route await zijn params.
 *
 * WAT ER STOND. Op 2026-08-26 droeg elk artikel op deze site dezelfde
 * deelkaart. Niet dezelfde taal — dezelfde kaart: titel, tag en leestijd
 * kwamen nooit aan, en wat LinkedIn en Slack toonden was de generieke
 * terugval. Gemeten op een productiebuild waren vier talen van hetzelfde
 * artikel byte-identiek (54285), en twee verschillende artikelen in dezelfde
 * taal ook. Na de reparatie geeft alleen nog een slug die niet bestaat die
 * 54285 terug.
 *
 * DE OORZAAK. Next 16 levert `params` als Promise. De drie routes typeerden
 * hem als gewoon object en lazen `.locale` en `.slug` er rechtstreeks vanaf.
 * Op een Promise bestaan die velden niet, dus beide waren `undefined`:
 * `assertLocale` viel terug op "en" en de opzoeking gaf niets. Er ging niets
 * stuk — de route antwoordde 200 met een geldige PNG. Precies daarom stond
 * het er zo lang.
 *
 * WAAROM GEEN VAN DE BESTAANDE POORTEN HET ZAG.
 *
 * `tsc` kan het niet. Next genereert per-route typevalidators onder
 * `.next/types`, en voor metadata-routes doet hij dat niet — gemeten op
 * 2026-08-26: nul bestanden die `opengraph-image` noemen, terwijl 23
 * bestanden in `app/` `params: Promise<` correct typeren. Die 23 staan goed
 * omdat iemand ze goed schreef, niet omdat een poort het afdwong.
 *
 * `kale-tekst` kan het ook niet. Die leest JSX-tekstknopen en vier
 * attributen; hier is de tekst niet fout, hij komt niet aan.
 *
 * WAAROM DIT EEN TEKSTSCAN IS EN GEEN MODULE-IMPORT. Het defect zit in de
 * bedrading, niet in de logica. De default-export aanroepen zou een
 * `ImageResponse` renderen — zwaar, en het bewijst de bedrading alsnog niet,
 * want een aanroep met een gewoon object slaagt bij beide vormen. Zelfde
 * afweging als bij de poort op `lead-acknowledge`.
 *
 * WAT DEZE POORT NIET ZIET. Of de gerenderde kaart klopt. Dat is op de
 * productiebuild gemeten met een byte-vergelijking plus een
 * determinismecontrole; hier staat alleen dat de taal en de slug de functie
 * bereiken.
 */

const WORTEL_DIR = join(__dirname, "..");

function deelkaartRoutes(dir: string): string[] {
  return readdirSync(dir).flatMap((naam) => {
    const pad = join(dir, naam);
    if (statSync(pad).isDirectory()) {
      return naam === "node_modules" ? [] : deelkaartRoutes(pad);
    }
    return naam === "opengraph-image.tsx" ? [pad] : [];
  });
}

const ROUTES = deelkaartRoutes(join(WORTEL_DIR, "app"))
  .map((p) => relative(WORTEL_DIR, p).split(sep).join("/"))
  .sort();

const BRON = new Map(
  ROUTES.map((r) => [r, zonderCommentaar(readFileSync(join(WORTEL_DIR, r), "utf8"))]),
);

/* Een route "neemt params" zodra hij het woord in zijn code noemt. Afgeleid,
 * niet ingetypt: een vierde route die iemand toevoegt valt hier vanzelf in. */
const MET_PARAMS = ROUTES.filter((r) => BRON.get(r)!.includes("params"));

/* Elke .tsx onder een map, met zijn bron. Afgeleid en niet ingetypt, zodat
 * een nieuwe pagina hier vanzelf in valt. */
function tsxBronnen(dir: string): Array<{ pad: string; bron: string }> {
  return readdirSync(dir).flatMap((naam) => {
    const pad = join(dir, naam);
    if (statSync(pad).isDirectory()) {
      return naam === "node_modules" ? [] : tsxBronnen(pad);
    }
    if (!naam.endsWith(".tsx")) return [];
    return [
      {
        pad: relative(WORTEL_DIR, pad).split(sep).join("/"),
        bron: readFileSync(pad, "utf8"),
      },
    ];
  });
}

describe("deelkaarten: params worden geawait", () => {
  /* Zonder deze twee slaagt alles hieronder op een lege lijst, en dan meet de
   * poort niets. Vier = de wortelkaart plus de drie dynamische routes. */
  it("vindt de deelkaart-routes", () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(4);
    expect(ROUTES).toContain("app/opengraph-image.tsx");
  });

  it("vindt routes die params nemen", () => {
    expect(MET_PARAMS.length).toBeGreaterThanOrEqual(3);
  });

  it("de wortelkaart neemt geen params", () => {
    // Hij heeft geen dynamisch segment. Staat hij hier ooit wel in, dan is de
    // afleiding hierboven stuk en meet de rest de verkeerde verzameling.
    expect(MET_PARAMS).not.toContain("app/opengraph-image.tsx");
  });

  it("typeert params als Promise en await hem", () => {
    const fout = MET_PARAMS.filter((r) => {
      const b = BRON.get(r)!;
      return !b.includes("params: Promise<") || !b.includes("await params");
    });
    expect(fout, "typeer als params: Promise<...> en lees met await").toEqual([]);
  });

  it("leest geen veld rechtstreeks van de Promise", () => {
    const fout = MET_PARAMS.flatMap((r) => {
      const b = BRON.get(r)!;
      return ["params.locale", "params.slug", "params.tag"]
        .filter((v) => b.includes(v))
        .map((v) => `${r}: ${v}`);
    });
    expect(fout, "op een Promise is dat undefined, en het faalt stil").toEqual([]);
  });
});

describe("de meetlat zelf", () => {
  /* Vier eerdere tekstscans in deze repo vielen om op hun eigen toelichting.
   * De strip voorkomt dat; deze twee bewijzen dat hij werkt in plaats van dat
   * hij alles wegknipt. */
  const VERBODEN = "params" + "." + "locale";

  it("ziet de overtreding niet in een toelichting", () => {
    const nep = ["// zo stond het fout: " + VERBODEN, "const x = 1;"].join("\n");
    expect(zonderCommentaar(nep)).not.toContain(VERBODEN);
    expect(zonderCommentaar(nep)).toContain("const x = 1;");
  });

  it("ziet de overtreding wel in echte code", () => {
    const nep = "const l = assertLocale(" + VERBODEN + ");";
    expect(zonderCommentaar(nep)).toContain(VERBODEN);
  });
});

/* De voorwaarde onder de vrijstelling van de wortelkaart.
 *
 * `app/opengraph-image.tsx` draagt Engelse kopij en staat daarom in TOEGESTAAN
 * in lib/i18n/kale-tekst.test.ts. Die vrijstelling is alleen waar zolang de
 * kaart niets anders is dan de entiteitsafbeelding van de JSON-LD. Wordt hij
 * ergens weer als og:image gezet, dan deelt die pagina in vier talen dezelfde
 * Engelse kaart en is de reden onder de vrijstelling onwaar.
 *
 * Een vrijstelling die zijn eigen feit overleeft is erger dan geen
 * vrijstelling: hij legt een onwaarheid vast op precies de plek waar een
 * volgende sessie hem vertrouwt.
 */
describe("de wortelkaart is alleen nog de entiteitsafbeelding", () => {
  const WORTEL = "/opengraph" + "-image";
  // Anker op het aanhalingsteken ervoor: een kale wortelkaart staat als
  // "/opengraph-image" in de bron, terwijl een correcte kaart per artikel
  // `/${l}/insights/${post.slug}/opengraph-image` is en dus een `}` ervoor
  // draagt. Zonder dat anker meldt de poort die correcte paden als fout.
  const KAAL = new RegExp("[\"'`]" + WORTEL);

  it("er is een kaart per taal", () => {
    expect(ROUTES).toContain("app/[locale]/opengraph-image.tsx");
  });

  it("ogImages en twitterImages dragen de taal", () => {
    for (const l of LOCALES) {
      const og = ogImages(l);
      expect(og.length).toBeGreaterThan(0);
      for (const img of og) {
        expect(img.url, `ogImages(${l})`).toBe(`/${l}` + WORTEL);
      }
      for (const url of twitterImages(l)) {
        expect(url, `twitterImages(${l})`).toBe(`/${l}` + WORTEL);
      }
    }
  });

  it("de vier talen krijgen vier verschillende kaarten", () => {
    const urls = new Set(LOCALES.map((l) => ogImages(l)[0].url));
    expect(urls.size).toBe(LOCALES.length);
  });

  it("AUTHOR_IMAGE_URL wijst nog naar de wortelkaart", () => {
    // Dit IS de reden waarom de wortelkaart mag blijven bestaan met Engelse
    // kopij: hij draagt Person.image en Organization.image in de JSON-LD.
    // Wijst hij ergens anders heen, dan is de vrijstelling onwaar.
    expect(AUTHOR_IMAGE_URL.endsWith(WORTEL)).toBe(true);
  });

  it("de kale-pad-scan matcht geen pad dat de taal wel draagt", () => {
    // Zonder het aanhalingsteken ervoor matcht de scan de STAART van een
    // correct pad. Beide richtingen, anders is groen ook te verklaren door
    // een regex die niets vindt.
    expect(KAAL.test('images: [{ url: "' + WORTEL + '" }]')).toBe(true);
    expect(KAAL.test("url: `/${l}/insights/${post.slug}" + WORTEL + "`")).toBe(false);
  });

  it("geen bron onder app/[locale] noemt de kale wortelkaart", () => {
    // Sterker dan alleen `images:` matchen: onder [locale] is er geen enkele
    // legitieme reden om dat pad letterlijk te noemen. Elke vermelding is een
    // pagina die terugvalt op de Engelse kaart.
    const bronnen = tsxBronnen(join(WORTEL_DIR, "app", "[locale]"));
    expect(
      bronnen.length,
      "geen bronnen gevonden — de wandeling is stuk, en dan slaagt de rest op niets",
    ).toBeGreaterThan(10);
    const overtreders = bronnen
      .filter((b) => KAAL.test(zonderCommentaar(b.bron)))
      .map((b) => b.pad);
    expect(
      overtreders,
      "wijst weer naar de Engelse wortelkaart in plaats van ogImages(l)",
    ).toEqual([]);
  });
});
