import { describe, it, expect } from "vitest";
import {
  haalTitel,
  haalDescription,
  haalCanonical,
  haalH1s,
  haalLinks,
  haalAfbeeldingen,
  haalJsonLd,
  controleerDubbeleTitels,
  controleerDubbeleDescriptions,
  controleerH1,
  controleerCanonical,
  controleerRedirect,
  controleerAfbeeldingen,
  controleerAnkers,
  controleerJsonLd,
  vindWezen,
  controleerLocaleLozeLinks,
  auditPagina,
  telPerErnst,
  type Pagina,
  controleerTitelLengte,
  controleerDescriptionLengte,
  TITEL_MAX,
  DESC_MAX,
} from "./audit";

const pagina = (url: string, html: string, extra: Partial<Pagina> = {}): Pagina => ({
  url,
  status: 200,
  keten: [url],
  html,
  ...extra,
});

describe("HTML uitlezen", () => {
  it("haalt de titel op en ontslaat entiteiten", () => {
    expect(haalTitel("<title>Prijzen &amp; voorwaarden</title>")).toBe("Prijzen & voorwaarden");
  });

  it("haalt een titel op die over meerdere regels en spans loopt", () => {
    // Dit is de vorm waar mijn eerste regex vandaag op stukliep en waardoor
    // de homepage ten onrechte "geen h1" leek te hebben.
    const html = `<h1 class="x">\n  Ik bouw <span class="em">de systemen</span>\n</h1>`;
    expect(haalH1s(html)).toEqual(["Ik bouw de systemen"]);
  });

  it("vindt de description en canonical", () => {
    const html = `<meta name="description" content="Kort en bondig"><link rel="canonical" href="https://x.test/nl"/>`;
    expect(haalDescription(html)).toBe("Kort en bondig");
    expect(haalCanonical(html)).toBe("https://x.test/nl");
  });

  it("geeft null wanneer een veld ontbreekt", () => {
    expect(haalTitel("<p>niets</p>")).toBeNull();
    expect(haalDescription("<p>niets</p>")).toBeNull();
    expect(haalCanonical("<p>niets</p>")).toBeNull();
  });

  it("telt alt=\"\" als aanwezig, want dat markeert een decoratieve afbeelding", () => {
    const beelden = haalAfbeeldingen('<img src="a.png" alt=""><img src="b.png">');
    expect(beelden).toHaveLength(2);
    expect(beelden[0].heeftAlt).toBe(true);
    expect(beelden[1].heeftAlt).toBe(false);
  });

  it("haalt links op", () => {
    expect(haalLinks('<a href="/nl/werk">w</a><a href="https://x.test/a">a</a>')).toEqual([
      "/nl/werk",
      "https://x.test/a",
    ]);
  });
});

describe("controleerH1", () => {
  it("meldt een ontbrekende h1 als fout", () => {
    const b = controleerH1(pagina("https://x.test/a", "<p>geen kop</p>"));
    expect(b).toHaveLength(1);
    expect(b[0].ernst).toBe("fout");
    expect(b[0].soort).toBe("geen-h1");
  });

  it("meldt meerdere h1's als waarschuwing", () => {
    const b = controleerH1(pagina("https://x.test/a", "<h1>een</h1><h1>twee</h1>"));
    expect(b[0].soort).toBe("meerdere-h1");
    expect(b[0].ernst).toBe("waarschuwing");
  });

  it("zwijgt bij precies één h1", () => {
    expect(controleerH1(pagina("https://x.test/a", "<h1>een</h1>"))).toEqual([]);
  });
});

describe("controleerCanonical", () => {
  it("meldt een afwijkende canonical als fout", () => {
    const b = controleerCanonical(
      pagina("https://x.test/nl", '<link rel="canonical" href="https://x.test/en"/>'),
    );
    expect(b[0].ernst).toBe("fout");
    expect(b[0].detail).toContain("https://x.test/en");
  });

  it("zwijgt wanneer de canonical naar zichzelf wijst", () => {
    expect(
      controleerCanonical(pagina("https://x.test/nl", '<link rel="canonical" href="https://x.test/nl"/>')),
    ).toEqual([]);
  });
});

describe("controleerRedirect", () => {
  it("zwijgt zonder redirect", () => {
    expect(controleerRedirect(pagina("https://x.test/a", ""))).toEqual([]);
  });

  it("waarschuwt bij één hop", () => {
    const b = controleerRedirect(
      pagina("https://x.test/a", "", { keten: ["https://x.test/a", "https://x.test/b"] }),
    );
    expect(b[0].ernst).toBe("waarschuwing");
  });

  // Een keten van twee of meer is duurder: elke hop is een extra ronde voor
  // de crawler en verlies van signaal.
  it("maakt er een fout van bij twee of meer hops", () => {
    const b = controleerRedirect(
      pagina("https://x.test/a", "", { keten: ["a", "b", "c"] }),
    );
    expect(b[0].ernst).toBe("fout");
    expect(b[0].detail).toContain("2 hop");
  });
});

describe("dubbele titels en descriptions", () => {
  it("vindt twee pagina's met dezelfde titel", () => {
    const b = controleerDubbeleTitels([
      pagina("https://x.test/a", "<title>Zelfde</title>"),
      pagina("https://x.test/b", "<title>Zelfde</title>"),
      pagina("https://x.test/c", "<title>Anders</title>"),
    ]);
    expect(b).toHaveLength(1);
    expect(b[0].ernst).toBe("fout");
    expect(b[0].detail).toContain("2 URL's");
  });

  it("meldt niets wanneer alle titels uniek zijn", () => {
    expect(
      controleerDubbeleTitels([
        pagina("https://x.test/a", "<title>Een</title>"),
        pagina("https://x.test/b", "<title>Twee</title>"),
      ]),
    ).toEqual([]);
  });

  it("dubbele description is een waarschuwing, geen fout", () => {
    const b = controleerDubbeleDescriptions([
      pagina("https://x.test/a", '<meta name="description" content="zelfde">'),
      pagina("https://x.test/b", '<meta name="description" content="zelfde">'),
    ]);
    expect(b[0].ernst).toBe("waarschuwing");
  });
});

describe("JSON-LD", () => {
  it("meldt onparseerbare JSON-LD als fout", () => {
    const b = controleerJsonLd(
      pagina("https://x.test/a", '<script type="application/ld+json">{kapot,,}</script>'),
    );
    expect(b[0].ernst).toBe("fout");
    expect(b[0].soort).toBe("json-ld-kapot");
  });

  it("accepteert geldige JSON-LD met @type", () => {
    expect(
      controleerJsonLd(
        pagina("https://x.test/a", '<script type="application/ld+json">{"@type":"FAQPage"}</script>'),
      ),
    ).toEqual([]);
  });

  it("accepteert @graph zonder @type op het hoogste niveau", () => {
    expect(
      controleerJsonLd(
        pagina("https://x.test/a", '<script type="application/ld+json">{"@graph":[]}</script>'),
      ),
    ).toEqual([]);
  });

  it("leest meerdere blokken op één pagina", () => {
    const html =
      '<script type="application/ld+json">{"@type":"A"}</script>' +
      '<script type="application/ld+json">{"@type":"B"}</script>';
    expect(haalJsonLd(html)).toHaveLength(2);
  });
});

describe("JSON-LD: arrays zijn geldig", () => {
  // Deze twee dekken de fout die de audit op 2026-08-03 op alle 176 pagina's
  // meldde: breadcrumbs staan als array in de JSON-LD en hebben geen @type op
  // het hoogste niveau. Dat is correct schema, geen probleem.
  it("accepteert een array van knooppunten met @type", () => {
    const html = '<script type="application/ld+json">[{"@type":"BreadcrumbList"},{"@type":"ListItem"}]</script>';
    expect(controleerJsonLd(pagina("https://x.test/a", html))).toEqual([]);
  });

  it("meldt een array waarvan een element geen @type heeft", () => {
    const html = '<script type="application/ld+json">[{"@type":"A"},{"naam":"zonder type"}]</script>';
    const b = controleerJsonLd(pagina("https://x.test/a", html));
    expect(b).toHaveLength(1);
    expect(b[0].soort).toBe("json-ld-zonder-type");
  });
});

describe("controleerLocaleLozeLinks", () => {
  const basis = "https://x.test";
  const locales = ["en", "nl"];

  it("meldt een interne link zonder taalprefix", () => {
    const paginas = [
      pagina("https://x.test/en/a", '<a href="/b">b</a>'),
      pagina("https://x.test/en/b", ""),
    ];
    const b = controleerLocaleLozeLinks(paginas, basis, locales);
    expect(b).toHaveLength(1);
    expect(b[0].soort).toBe("link-zonder-taal");
    expect(b[0].detail).toContain("/b");
  });

  it("zwijgt wanneer de link het taalprefix wél heeft", () => {
    const paginas = [
      pagina("https://x.test/en/a", '<a href="/en/b">b</a>'),
      pagina("https://x.test/en/b", ""),
    ];
    expect(controleerLocaleLozeLinks(paginas, basis, locales)).toEqual([]);
  });

  it("negeert een link naar iets wat ook mét prefix niet bestaat", () => {
    const paginas = [pagina("https://x.test/en/a", '<a href="/bestaat-niet">x</a>')];
    expect(controleerLocaleLozeLinks(paginas, basis, locales)).toEqual([]);
  });
});

describe("vindWezen", () => {
  const basis = "https://x.test";

  it("vindt een pagina waar niets naartoe linkt", () => {
    const b = vindWezen(
      [
        pagina("https://x.test/a", '<a href="/b">b</a>'),
        pagina("https://x.test/b", "<p>ik word gelinkt</p>"),
        pagina("https://x.test/c", "<p>niemand linkt naar mij</p>"),
      ],
      basis,
    );
    expect(b.map((x) => x.url)).toEqual(["https://x.test/a", "https://x.test/c"]);
  });

  it("telt een relatieve link mee als verwijzing", () => {
    const b = vindWezen(
      [pagina("https://x.test/map/a", '<a href="./b">b</a>'), pagina("https://x.test/map/b", "")],
      basis,
    );
    expect(b.map((x) => x.url)).not.toContain("https://x.test/map/b");
  });

  it("negeert anchors, mailto en tel", () => {
    const b = vindWezen(
      [pagina("https://x.test/a", '<a href="#top">t</a><a href="mailto:x@y.z">m</a>')],
      basis,
    );
    expect(b).toHaveLength(1); // /a is zelf een wees, dat klopt
  });

  it("negeert externe links", () => {
    const b = vindWezen([pagina("https://x.test/a", '<a href="https://ander.test/b">x</a>')], basis);
    expect(b).toHaveLength(1);
  });

  // De reparatie: een link zonder taalprefix bereikt de pagina wél, via de
  // middleware. Zonder dit meldde de audit alle 176 pagina's als wees.
  it("telt een link zonder taalprefix als verwijzing", () => {
    const paginas = [
      pagina("https://x.test/en/a", '<a href="/b">b</a>'),
      pagina("https://x.test/en/b", ""),
    ];
    const b = vindWezen(paginas, basis, ["en", "nl"]);
    expect(b.map((x) => x.url)).not.toContain("https://x.test/en/b");
  });
});

describe("auditPagina", () => {
  it("stopt bij een niet-200 en meldt alleen de status", () => {
    const b = auditPagina(pagina("https://x.test/a", "", { status: 404 }));
    expect(b).toHaveLength(1);
    expect(b[0].soort).toBe("status");
    expect(b[0].detail).toBe("HTTP 404");
  });

  it("een schone pagina levert niets op", () => {
    // Titel en beschrijving horen bij een schone pagina; sinds de
    // lengtecontroles bestaan is een pagina zonder die twee niet schoon.
    const html =
      '<title>Een titel van keurige lengte hier</title>' +
      '<meta name="description" content="' + "d".repeat(120) + '">' +
      '<h1>Kop</h1><link rel="canonical" href="https://x.test/a"/>' +
      '<img src="a.png" alt="beschrijving">' +
      '<script type="application/ld+json">{"@type":"WebPage"}</script>';
    expect(auditPagina(pagina("https://x.test/a", html))).toEqual([]);
  });

  it("verzamelt meerdere problemen op één pagina", () => {
    const b = auditPagina(pagina("https://x.test/a", '<img src="a.png">'));
    const soorten = b.map((x) => x.soort);
    expect(soorten).toContain("geen-h1");
    expect(soorten).toContain("geen-canonical");
    expect(soorten).toContain("geen-titel");
    expect(soorten).toContain("geen-description");
    expect(soorten).toContain("img-zonder-alt");
  });
});

describe("telPerErnst", () => {
  it("telt per categorie", () => {
    const t = telPerErnst([
      { ernst: "fout", soort: "a", url: "u", detail: "" },
      { ernst: "fout", soort: "b", url: "u", detail: "" },
      { ernst: "waarschuwing", soort: "c", url: "u", detail: "" },
    ]);
    expect(t).toEqual({ fout: 2, waarschuwing: 1, notitie: 0 });
  });
});

/* ── lengtecontroles ─────────────────────────────────────────────────────── */

// hergebruikt de pagina()-helper hierboven
const metTitel = (t: string) =>
  pagina("https://x.nl/en", `<html><head><title>${t}</title></head><body></body></html>`);
const metDesc = (d: string) =>
  pagina("https://x.nl/en", `<html><head><title>Een prima titel hier</title><meta name="description" content="${d}"></head></html>`);
const zonderKop = () => pagina("https://x.nl/en", "<html><head></head></html>");

describe("controleerTitelLengte", () => {
  it("zwijgt bij een titel binnen de grenzen", () => {
    expect(controleerTitelLengte(metTitel("Operations consultant vastgoed · Juan Diaz"))).toEqual([]);
  });

  it("meldt een ontbrekende titel als fout", () => {
    const b = controleerTitelLengte(zonderKop());
    expect(b).toHaveLength(1);
    expect(b[0].soort).toBe("geen-titel");
    expect(b[0].ernst).toBe("fout");
  });

  it("waarschuwt bij een te lange titel en noemt het aantal", () => {
    const t = "Why most operator dashboards quietly lie to their CEOs · Juan Diaz";
    const b = controleerTitelLengte(metTitel(t));
    expect(b[0].soort).toBe("titel-te-lang");
    expect(b[0].ernst).toBe("waarschuwing");
    expect(b[0].detail).toContain(`${t.length} tekens`);
  });

  // Dit is de valkuil: de ruwe HTML bevat &amp;, wat vijf tekens is maar er
  // één toont. Zonder ontsla() zou elke titel met een & vals alarm geven.
  it("telt een HTML-entiteit als het teken dat de lezer ziet", () => {
    const zichtbaar = "Energie & zon voor operators, en meer tekst erbij hier";
    expect(zichtbaar.length).toBeLessThanOrEqual(TITEL_MAX);
    expect(controleerTitelLengte(metTitel(zichtbaar.replace("&", "&amp;")))).toEqual([]);
  });

  it("noteert een te korte titel, maar niet als fout", () => {
    const b = controleerTitelLengte(metTitel("Werk"));
    expect(b[0].soort).toBe("titel-te-kort");
    expect(b[0].ernst).toBe("notitie");
  });

  it("de grens zelf telt nog als goed", () => {
    expect(controleerTitelLengte(metTitel("x".repeat(TITEL_MAX)))).toEqual([]);
    expect(controleerTitelLengte(metTitel("x".repeat(TITEL_MAX + 1)))[0].soort).toBe("titel-te-lang");
  });
});

describe("controleerDescriptionLengte", () => {
  it("zwijgt bij een beschrijving binnen de grenzen", () => {
    expect(controleerDescriptionLengte(metDesc("d".repeat(120)))).toEqual([]);
  });

  it("waarschuwt als de beschrijving ontbreekt", () => {
    const b = controleerDescriptionLengte(metTitel("Een prima titel hier"));
    expect(b[0].soort).toBe("geen-description");
    expect(b[0].ernst).toBe("waarschuwing");
  });

  it("waarschuwt bij te lang en toont waar de staart wegvalt", () => {
    const b = controleerDescriptionLengte(metDesc("d".repeat(DESC_MAX + 30)));
    expect(b[0].soort).toBe("description-te-lang");
    expect(b[0].detail).toContain("30 boven");
  });

  it("noteert te kort", () => {
    expect(controleerDescriptionLengte(metDesc("kort"))[0].soort).toBe("description-te-kort");
  });
});

describe("controleerAnkers", () => {
  it("meldt een <a> zonder href", () => {
    // Precies de vorm die de homepage op 2026-08-20 van 0,95+ naar 0,92 bracht.
    const b = controleerAnkers(pagina("/en", '<a class="v-card wide">Philly</a>'));
    expect(b).toHaveLength(1);
    expect(b[0].soort).toBe("anker-zonder-href");
  });

  it("meldt een lege href, een kale # en javascript:", () => {
    for (const h of ['href=""', 'href="#"', 'href="javascript:void(0)"']) {
      expect(controleerAnkers(pagina("/en", `<a ${h}>x</a>`))).toHaveLength(1);
    }
  });

  it("laat een gewone link en een skip-link met rust", () => {
    // #main is een geldige, bereikbare link naar dezelfde pagina. Zou die wel
    // meetellen, dan meldt elke pagina van deze site een valse treffer en
    // wordt de controle binnen een week uitgezet.
    const html = '<a href="#main" class="skip">Naar inhoud</a><a href="/en/work">Werk</a>';
    expect(controleerAnkers(pagina("/en", html))).toEqual([]);
  });

  it("telt alles en noemt een voorbeeld", () => {
    const b = controleerAnkers(pagina("/en", "<a>een</a><a>twee</a>"));
    expect(b[0].detail).toContain("2 <a>");
  });

  it("draait mee in auditPagina", () => {
    // Zonder deze assertie kan de controle bestaan en nergens worden
    // aangeroepen -- dan is hij een poort die nooit afgaat.
    const html = "<title>T</title><h1>H</h1><a>kapot</a>";
    const soorten = auditPagina(pagina("/en", html)).map((b) => b.soort);
    expect(soorten).toContain("anker-zonder-href");
  });
});
