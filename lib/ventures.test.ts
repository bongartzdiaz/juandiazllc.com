import { describe, it, expect } from "vitest";
import { VENTURES, getVenture, getVentures, getVentureForTag, localizeVenture, type Venture } from "./ventures";
import { TITLE_SUFFIX, TITLE_BUDGET } from "./seo/branding";
import { DICT, LOCALES, type Locale } from "./i18n/dict";

/* Zelfde opzet als sectors.test.ts: eerst het merge-gedrag, daarna een gate
   over de data. Die tweede groep is wat voorkomt dat /nl, /de en /es opnieuw
   dezelfde Engelse titel gaan serveren. */

const VERTAALD: Locale[] = ["nl", "de", "es"];

const basis: Venture = {
  slug: "test",
  name: "Testventure",
  tagline: "Basis-tagline.",
  sector: "Energy",
  sectorSlug: "energy",
  status: "live",
  domain: "test.nl",
  external: "https://test.nl",
  summary: "Basis-samenvatting.",
  story: "Basis-verhaal.",
  phases: [
    { title: "Survey", body: "EN survey." },
    { title: "Build", body: "EN build." },
  ],
  stack: ["Next.js"],
  metrics: [{ label: "Status", value: "Live" }],
  relatedSectors: ["Energy"],
  gradient: "radial-gradient(red, blue)",
};

describe("localizeVenture", () => {
  it("geeft de basis terug als de taal geen vertaling heeft", () => {
    expect(localizeVenture(basis, "de")).toBe(basis);
  });

  it("vervangt kopij en laat de rest staan", () => {
    const v = localizeVenture({ ...basis, i18n: { nl: { tagline: "NL-tagline." } } }, "nl");
    expect(v.tagline).toBe("NL-tagline.");
    expect(v.summary).toBe("Basis-samenvatting.");
  });

  // De vijf fasenamen zijn eigennamen van de methode en zijn in elke taal
  // gelijk; alleen de body vertaalt.
  it("houdt de fasetitel bij de basis en vertaalt alleen de body", () => {
    const v = localizeVenture(
      { ...basis, i18n: { nl: { phases: [{ body: "NL survey." }, { body: "NL build." }] } } },
      "nl",
    );
    expect(v.phases[0].title).toBe("Survey");
    expect(v.phases[0].body).toBe("NL survey.");
    expect(v.phases[1].title).toBe("Build");
  });

  it("raakt naam, stack en structurele velden nooit aan", () => {
    const v = localizeVenture({ ...basis, i18n: { nl: { tagline: "NL." } } }, "nl");
    expect(v.name).toBe("Testventure");
    expect(v.stack).toEqual(["Next.js"]);
    expect(v.slug).toBe("test");
    expect(v.external).toBe("https://test.nl");
    expect(v.status).toBe("live");
  });

  it("muteert de basis niet", () => {
    const bron = { ...basis, i18n: { nl: { phases: [{ body: "NL." }] } } };
    localizeVenture(bron, "nl");
    expect(bron.phases[0].body).toBe("EN survey.");
  });
});

describe("getVenture / getVentures / getVentureForTag", () => {
  it("zonder taal komt de basis terug", () => {
    expect(getVenture("voltafy")?.tagline).toBe("The platform layer.");
    expect(getVentures()).toHaveLength(VENTURES.length);
  });

  it("met taal komt de vertaling terug", () => {
    expect(getVenture("voltafy", "nl")?.tagline).toBe("De platformlaag.");
    expect(getVenture("voltafy", "de")?.tagline).toBe("Die Plattformschicht.");
  });

  it("een onbekende slug geeft undefined", () => {
    expect(getVenture("bestaat-niet", "nl")).toBeUndefined();
  });

  it("de tag-kruislink is taalbewust", () => {
    expect(getVentureForTag("Energy", "es")?.tagline).toBe("La capa de plataforma.");
    expect(getVentureForTag("bestaat-niet", "nl")).toBeUndefined();
  });
});

describe("elke venture is in alle vier de talen af", () => {
  for (const v of VENTURES) {
    describe(v.slug, () => {
      it("heeft een vertaling voor nl, de en es", () => {
        for (const l of VERTAALD) {
          expect(v.i18n?.[l], `${v.slug} mist ${l}`).toBeDefined();
        }
      });

      it("levert vier verschillende titels op", () => {
        const titels = LOCALES.map((l) => {
          const x = getVenture(v.slug, l)!;
          return x.seoTitle ?? `${x.name} — ${x.tagline}`;
        });
        expect(new Set(titels).size, `dubbele titel: ${JSON.stringify(titels)}`).toBe(LOCALES.length);
      });

      it("levert vier verschillende beschrijvingen op", () => {
        const d = LOCALES.map((l) => {
          const x = getVenture(v.slug, l)!;
          return x.seoDescription ?? x.summary;
        });
        expect(new Set(d).size, `dubbele beschrijving: ${JSON.stringify(d)}`).toBe(LOCALES.length);
      });

      // `naam — tagline` liep voor drie van de vijf ventures over de 60
      // tekens die Google toont; vandaar de expliciete seoTitle.
      it("elke titel past binnen het budget dat Google toont", () => {
        for (const l of LOCALES) {
          const x = getVenture(v.slug, l)!;
          const titel = x.seoTitle ?? `${x.name} — ${x.tagline}`;
          expect(titel.length, `${v.slug}/${l} is ${titel.length} tekens: "${titel}"`).toBeLessThanOrEqual(TITLE_BUDGET);
        }
      });

      it("geen enkele titel draagt het merk zelf al", () => {
        for (const l of LOCALES) {
          const titel = getVenture(v.slug, l)!.seoTitle ?? "";
          expect(titel, `${v.slug}/${l}`).not.toContain(TITLE_SUFFIX.trim());
          expect(titel.toLowerCase(), `${v.slug}/${l}`).not.toContain("juan diaz");
        }
      });

      it("vertaalde lijsten hebben dezelfde lengte als de basis", () => {
        for (const l of VERTAALD) {
          const x = getVenture(v.slug, l)!;
          // phases gaat door mergeByIndex, dus de lengte van het resultaat is
          // altijd gelijk; de echte invariant zit in de rauwe vertaaldata.
          expect(v.i18n![l]!.phases, `${v.slug}/${l} phases`).toHaveLength(v.phases.length);
          expect(x.metrics, `${v.slug}/${l} metrics`).toHaveLength(v.metrics.length);
          expect(x.relatedSectors, `${v.slug}/${l} relatedSectors`).toHaveLength(v.relatedSectors.length);
        }
      });

      it("de fasenamen blijven in elke taal gelijk", () => {
        for (const l of VERTAALD) {
          expect(getVenture(v.slug, l)!.phases.map((p) => p.title)).toEqual(v.phases.map((p) => p.title));
        }
      });

      it("geen enkel vertaald veld is nog identiek aan het Engels", () => {
        for (const l of VERTAALD) {
          const x = getVenture(v.slug, l)!;
          expect(x.tagline, `${v.slug}/${l} tagline`).not.toBe(v.tagline);
          expect(x.summary, `${v.slug}/${l} summary`).not.toBe(v.summary);
          expect(x.story, `${v.slug}/${l} story`).not.toBe(v.story);
          for (const [i, p] of x.phases.entries()) {
            expect(p.body, `${v.slug}/${l} fase ${i + 1}`).not.toBe(v.phases[i].body);
          }
        }
      });
    });
  }
});

/* Een adres alleen als er iets te bezoeken is.
 *
 * Philly droeg `domain: "philly.juandiazllc.com"` terwijl DNS er NXDOMAIN op
 * geeft — gemeten 2026-08-20 via de eigen resolver én via Cloudflare DoH, dus
 * geen lokale hapering. Dat adres stond in vier talen op /work en op de
 * homepage, onder de zin dat je erop mag klikken en zelf mag oordelen. Wie het
 * intypte kwam nergens uit. `external` wees intussen naar `/app`, een pad dat
 * 404 geeft sinds de surface met #134-#140 uit deze repo verdween.
 *
 * Deze gate is structureel en raakt het netwerk niet: hij bewaakt dat een adres
 * en de status elkaar niet tegenspreken. Dat een lopend domein ooit ophoudt te
 * bestaan ziet hij niet — dat is de reachability-controle in de dagelijkse
 * productie-audit (scripts/seo-audit.ts). Twee verschillende vragen. */
describe("een venture toont alleen een adres als hij live is", () => {
  it("controleert daadwerkelijk ventures", () => {
    expect(VENTURES.length).toBeGreaterThan(3);
  });

  for (const v of VENTURES) {
    describe(v.slug, () => {
      it(`heeft ${v.status === "live" ? "wel" : "geen"} adres, passend bij status "${v.status}"`, () => {
        if (v.status === "live") {
          expect(v.domain, "een live venture zonder adres is niet te bezoeken").toBeTruthy();
        } else {
          expect(
            v.domain,
            "een adres onder een productnaam leest als 'ga maar kijken' — pas als het er is",
          ).toBeNull();
        }
      });

      it("laat domain en external niet uiteenlopen", () => {
        if (v.domain === null) {
          expect(v.external, "geen adres betekent ook niets om heen te linken").toBeNull();
        } else {
          expect(v.external, `external hoort https://${v.domain} te zijn`).toBe(`https://${v.domain}`);
        }
      });

      it("wijst nooit naar een intern pad", () => {
        // `/app` stond hier maandenlang en gaf 404. Een intern pad in dit veld
        // is per definitie fout: het veld beschrijft waar het product woont.
        expect(v.domain ?? "", `${v.slug} domain`).not.toMatch(/^\//);
        expect(v.external ?? "https://x", `${v.slug} external`).toMatch(/^https:\/\//);
      });
    });
  }
});

/* De kopij telt mee wat de data zegt.
 *
 * `work.page.lede` noemde in vier talen "vijf live producten … en Philly",
 * terwijl `docs/claims.md` er vier noemt en Philly daar bewust niet bij staat.
 * De status in dit bestand stond al op "shipping"; alleen de zin wist dat niet.
 *
 * Deze gate koppelt de twee: het telwoord in de lede moet overeenkomen met het
 * aantal ventures dat werkelijk `status: "live"` draagt. Zet iemand een status
 * om zonder de zin te herschrijven, dan valt hij hier om — in alle vier de
 * talen tegelijk, want het telwoord staat per taal in de tabel hieronder.
 *
 * Op DICT[l] geasserteerd, niet via translate(): die valt stil terug op Engels,
 * dus een Duitse lede die het Engelse telwoord draagt zou er werkend uitzien. */
describe("work.page.lede telt hetzelfde als de venture-data", () => {
  const TELWOORD: Record<Locale, Record<number, string>> = {
    en: { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six" },
    nl: { 1: "één", 2: "twee", 3: "drie", 4: "vier", 5: "vijf", 6: "zes" },
    de: { 1: "ein", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf", 6: "sechs" },
    es: { 1: "un", 2: "dos", 3: "tres", 4: "cuatro", 5: "cinco", 6: "seis" },
  };

  const live = VENTURES.filter((v) => v.status === "live").length;

  it("heeft een telwoord voor het huidige aantal", () => {
    expect(
      TELWOORD.en[live],
      `${live} live ventures — vul dat telwoord aan in alle vier de talen`,
    ).toBeDefined();
  });

  /* Alleen de eerste zin, en dat is geen kosmetiek: elke lede sluit af met de
   * vijf-fase-methode, dus het woord "vijf" / "five" / "fünf" / "cinco" staat
   * er sowieso in. Een controle over de hele tekst zou bij vijf live ventures
   * slagen op het verkeerde woord — precies het geval waarvoor deze gate er is. */
  const eersteZin = (l: Locale) => DICT[l]["work.page.lede"].split(". ")[0].toLowerCase();

  for (const l of LOCALES) {
    it(`${l} noemt er ${live}`, () => {
      const lede = DICT[l as Locale]["work.page.lede"];
      expect(lede, `work.page.lede ontbreekt in ${l}`).toBeTruthy();
      expect(
        eersteZin(l as Locale),
        `${l} telt niet "${TELWOORD[l as Locale][live]}": "${lede}"`,
      ).toContain(TELWOORD[l as Locale][live]);
    });

    it(`${l} noemt maar één aantal`, () => {
      // Twee telwoorden in dezelfde zin maakt de controle hierboven waardeloos:
      // hij zou dan slagen zolang er tóevallig eentje klopt.
      const andere = Object.entries(TELWOORD[l as Locale])
        .filter(([n]) => Number(n) !== live)
        .filter(([, woord]) => eersteZin(l as Locale).includes(woord))
        .map(([n, woord]) => `${woord} (${n})`);
      expect(andere, `${l} draagt nog een telwoord in de openingszin`).toEqual([]);
    });
  }

  it("noemt elke live venture bij naam", () => {
    // Anders klopt het getal wel en de opsomming niet.
    for (const l of LOCALES) {
      for (const v of VENTURES.filter((x) => x.status === "live")) {
        expect(DICT[l as Locale]["work.page.lede"], `${v.name} ontbreekt in ${l}`).toContain(v.name);
      }
    }
  });
});

/* Het label van een venture die nog niet draait, mag niet zeggen dat hij draait.
 *
 * Aanleiding. In het Nederlands stond op de Philly-kaart "In productie". In een
 * softwarecontext leest dat als "draait in productie" — precies wat de kaart
 * ontkent, en het stond naast vier kaarten die "Live" zeggen. De andere drie
 * talen deden het goed: Shipping, Kommt, Próximamente.
 *
 * Een test kan niet zien of Nederlands klopt; dat was de leesbeurt. Wat hij wél
 * mechanisch kan bewaken is deze ene klasse: een status-badge die het
 * tegenovergestelde belooft van de status die hij draagt. De lijst is per taal
 * en draagt zijn reden mee, zodat een volgende sessie hem niet weghaalt omdat
 * niemand meer weet waarom hij er stond. */
describe("het label voor een venture die nog niet draait", () => {
  /** Woorden die in die taal "draait al" betekenen. */
  const KLINKT_ALS_LIVE: Record<Locale, string[]> = {
    en: ["live", "in production", "available"],
    nl: ["live", "in productie", "beschikbaar"],
    de: ["live", "in produktion", "verfügbar"],
    es: ["en vivo", "en producción", "disponible"],
  };

  it("de lijst heeft tanden — het live-label zou er in elke taal op vallen", () => {
    // Zonder deze controle kan de lijst leeglopen tot woorden die nergens
    // voorkomen, en dan slaagt de poort hieronder altijd. Het live-label is de
    // positieve controle: dát hoort er wél op te vallen.
    for (const l of LOCALES) {
      const live = DICT[l as Locale]["ventures.status.live"].toLowerCase();
      expect(
        KLINKT_ALS_LIVE[l as Locale].some((w) => live.includes(w)),
        `${l}: "${live}" valt op geen enkel woord uit de lijst — de lijst is vacuüm`,
      ).toBe(true);
    }
  });

  for (const l of LOCALES) {
    it(`${l} belooft niet dat het al draait`, () => {
      const soon = DICT[l as Locale]["ventures.status.soon"];
      expect(soon, `ventures.status.soon ontbreekt in ${l}`).toBeTruthy();
      const treffers = KLINKT_ALS_LIVE[l as Locale].filter((w) => soon.toLowerCase().includes(w));
      expect(
        treffers,
        `${l}: "${soon}" zegt dat het draait, op de kaart die zegt van niet`,
      ).toEqual([]);
    });
  }

  it("er is werkelijk een venture die dit label draagt", () => {
    // Anders bewaakt de poort kopij die nergens rendert, en dat hoort een
    // wees-sleutel te zijn, geen status-controle.
    expect(VENTURES.some((v) => v.status !== "live")).toBe(true);
  });
});
